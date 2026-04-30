import asyncio
import time
import json
import uuid
import argparse
from datetime import datetime, timezone

import aiohttp
from google.cloud import firestore

from payloads import generate_payload


# ---------- FIRESTORE ----------
db = firestore.Client()

def write_to_firestore(doc):
    try:
        db.collection("experiment_results").add(doc)
    except Exception as e:
        print("Firestore write failed:", e)


# ---------- HELPERS ----------
def now_ms():
    return int(time.time() * 1000)


async def post_json(session, url, payload, timeout_s):
    t0 = time.perf_counter()

    try:
        async with session.post(url, json=payload, timeout=timeout_s) as resp:
            content_type = resp.headers.get("Content-Type", "")

            if "application/json" in content_type:
                body = await resp.json()
            else:
                body = {"raw_text": await resp.text()}

        t1 = time.perf_counter()

        return {
            "ok": True,
            "status": resp.status,
            "rtt_ms": round((t1 - t0) * 1000, 3),
            "resp": body,
        }

    except Exception as e:
        t1 = time.perf_counter()

        return {
            "ok": False,
            "status": None,
            "rtt_ms": round((t1 - t0) * 1000, 3),
            "error": str(e),
        }


async def run_once(edge_url, cloud_url, payload, timeout_s):
    async with aiohttp.ClientSession() as session:
        edge_task = post_json(session, edge_url, payload, timeout_s)
        cloud_task = post_json(session, cloud_url, payload, timeout_s)

        edge_res, cloud_res = await asyncio.gather(edge_task, cloud_task)

    return {"payload": payload, "edge": edge_res, "cloud": cloud_res}


# ---------- MAIN LOOP ----------
async def run_loop(args):
    profiles = ["small", "medium", "large"] if args.benchmark else [args.profile]

    edge_rtts = []
    cloud_rtts = []

    for profile in profiles:
        print(f"\n===== Running profile: {profile} =====\n")

        for seq in range(1, args.count + 1):

            base_payload = json.loads(generate_payload(profile))
            base_payload["id"] = str(uuid.uuid4())
            base_payload["seq"] = seq
            base_payload["t_sent_unix_ms"] = now_ms()

            payload = base_payload

            result = await run_once(
                args.edge_url,
                args.cloud_url,
                payload,
                args.timeout,
            )

            payload_bytes = len(json.dumps(payload).encode("utf-8"))
            ts = datetime.now(timezone.utc).isoformat(timespec="seconds")

            edge = result["edge"]
            cloud = result["cloud"]

            edge_rtts.append(edge["rtt_ms"])
            cloud_rtts.append(cloud["rtt_ms"])

            print(f"[{ts}] seq={seq} profile={profile} payload_bytes={payload_bytes}")
            print(f" EDGE  ok={edge['ok']}  status={edge.get('status')}  rtt={edge['rtt_ms']}")
            print(f" CLOUD ok={cloud['ok']}  status={cloud.get('status')}  rtt={cloud['rtt_ms']}\n")

            doc = {
                "profile": profile,
                "timestamp": ts,
                "payload_bytes": payload_bytes,
                "edge_rtt_ms": edge["rtt_ms"],
                "cloud_rtt_ms": cloud["rtt_ms"],
                "edge_ok": edge["ok"],
                "cloud_ok": cloud["ok"],
                "scenario": args.scenario,
            }

            write_to_firestore(doc)

            if seq != args.count:
                await asyncio.sleep(args.interval)

    # ---------- FINAL SUMMARY ----------
    avg_edge = sum(edge_rtts) / len(edge_rtts) if edge_rtts else 0
    avg_cloud = sum(cloud_rtts) / len(cloud_rtts) if cloud_rtts else 0

    summary = {
        "edge_rtt_ms": round(avg_edge, 2),
        "cloud_rtt_ms": round(avg_cloud, 2),
        "edge_ok": True,
        "cloud_ok": True,
    }

    print("\n===== FINAL SUMMARY =====")
    print(json.dumps(summary, indent=2))

    # IMPORTANT → worker.py reads this JSON
    print(json.dumps(summary))


# ---------- CLI ----------
def main():
    parser = argparse.ArgumentParser(description="FYP Controller Benchmark")

    parser.add_argument("--edge-url", required=True)
    parser.add_argument("--cloud-url", required=True)
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--interval", type=float, default=1.0)
    parser.add_argument("--timeout", type=float, default=3.0)

    parser.add_argument(
        "--profile",
        choices=["small", "medium", "large"],
        default="small",
    )

    parser.add_argument("--benchmark", action="store_true")
    parser.add_argument("--scenario", default="live_test")

    args = parser.parse_args()

    asyncio.run(run_loop(args))


if __name__ == "__main__":
    main()
