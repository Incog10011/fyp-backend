import firebase_admin
from firebase_admin import credentials, firestore, storage
from google.cloud.firestore_v1 import FieldFilter
import subprocess
import json
import time
import os

# ---------------- FIREBASE INIT ----------------

cred = credentials.Certificate(
    "fyp-firebase-server-firebase-adminsdk-fbsvc-4a488ddc8a.json"
)

firebase_admin.initialize_app(
    cred,
    {
        "storageBucket": "fyp-firebase-server.firebasestorage.app",
    },
)

db = firestore.client()
bucket = storage.bucket()

print("Worker started. Connected to:", db.project)


# ---------------- PROFILE DETECTION ----------------

def detect_profile(file_size):

    kb = file_size / 1024

    if kb < 50:
        return "small"
    elif kb < 500:
        return "medium"
    else:
        return "large"


# ---------------- BENCHMARK ----------------

def run_benchmark(profile):

    result = subprocess.run(
        [
            "python",
            "controller.py",
            "--edge-url",
            "http://192.168.0.28:5000/ingest",
            "--cloud-url",
            "https://us-central1-fyp-firebase-server.cloudfunctions.net/ingestCloud",
            "--profile",
            profile,
            "--count",
            "1",
            "--scenario",
            "live_test",
        ],
        capture_output=True,
        text=True,
    )

    for line in reversed(result.stdout.splitlines()):
        if line.startswith("{") and line.endswith("}"):
            return json.loads(line)

    raise ValueError("No JSON output from controller")


# ---------------- PROCESS JOB ----------------

def process_job(job):

    job_id = job.id
    data = job.to_dict()

    print(f"\nProcessing job {job_id}")

    db.collection("jobs").document(job_id).update(
        {"status": "processing"}
    )

    file_path = data["filePath"]
    file_size = data.get("fileSize", 0)

    profile = detect_profile(file_size)

    local_file = "/tmp/" + os.path.basename(file_path)

    blob = bucket.blob(file_path)
    blob.download_to_filename(local_file)

    print(f"Downloaded: {local_file}")
    print(f"Profile: {profile}")

    results = run_benchmark(profile)

    db.collection("jobs").document(job_id).update(
        {
            "edge_rtt_ms": results.get("edge_rtt_ms"),
            "cloud_rtt_ms": results.get("cloud_rtt_ms"),
            "payload_bytes": file_size,
            "edge_ok": results.get("edge_ok"),
            "cloud_ok": results.get("cloud_ok"),
            "profile": profile,
            "scenario": "live_test",
            "status": "completed",
            "completedAt": firestore.SERVER_TIMESTAMP,
        }
    )

    print(f"Completed job {job_id}")


# ---------------- MAIN LOOP ----------------

while True:

    try:

        query = db.collection("jobs").where(
            filter=FieldFilter("status", "==", "pending")
        ).limit(5)

        jobs = list(query.stream())

        if not jobs:
            time.sleep(3)
            continue

        for job in jobs:
            process_job(job)

    except Exception as e:

        print("Worker error:", e)
        time.sleep(5)
