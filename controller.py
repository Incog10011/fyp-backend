import asyncio
import time
import json
import uuid
import argparse
import csv
import os
from datetime import datetime, timezone

import aiohttp
from payloads import generate_payload


# ---------------- HELPERS ----------------
def now_ms():
    return int(time.time() * 1000)


# ---------------- REQUEST FUNCTION ----------------
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
        rtt_ms = round((t1 - t0) * 1000, 3)

        # ---- Extract timestamps ----
        t_sent = payload.get("t_sent_unix_ms")
        t_received = body.get("t_received")
        t_processed = body.get("t_processed")
        t_response = now_ms()

        # ---- Compute metrics ----
        processing_time = None
        network_time = None
        total_time = None

        if t_sent and t_received and t_processed:
            processing_time = t_processed - t_received
            total_time = t_response - t_sent
            network_time = total_time - processing_time

        return {
            "ok": True,
            "status": resp.status,
            "rtt_ms": rtt_ms,
            "processing_time_ms": processing_time,
            "network_time_ms": network_time,
            "total_time_ms": total_time,
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


# ---------------- RUN ONE TEST ----------------
async def run_once(edge_url, cloud_url, payload, timeout_s):
    async with aiohttp.ClientSession() as session:
        edge_task = post_json(session, edge_url, payload, timeout_s)
        cloud_task = post_json(session, cloud_url, payload, timeout_s)

        edge_res, cloud_res = await asyncio.gather(edge_task, cloud_task)

    return {"payload": payload, "edge": edge_res, "cloud": cloud_res}


# ---------------- MAIN LOOP ----------------
async def run_loop(args):
    profiles = ["small", "medium", "large"] if args.benchmark else [args.profile]

    csv_file = "results.csv"

    # Create CSV with headers if it doesn't exist
    if not os.path.exists(csv_file):
        with open(csv_file, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "timestamp",
                "profile",
                "payload_bytes",
                "edge_rtt_ms",
                "cloud_rtt_ms",
                "edge_total_ms",
                "cloud_total_ms",
                "edge_processing_ms",
                "cloud_processing_ms",
                "edge_network_ms",
                "cloud_network_ms"
            ])

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

            # ---- Console output ----
            print(f"[{ts}] seq={seq} profile={profile} payload_bytes={payload_bytes}")
            print(f" EDGE  rtt={edge['rtt_ms']} ms total={edge.get('total_time_ms')}")
            print(f" CLOUD rtt={cloud['rtt_ms']} ms total={cloud.get('total_time_ms')}\n")

            # ---- Save to CSV ----
            with open(csv_file, "a", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([
                    ts,
                    profile,
                    payload_bytes,
                    edge["rtt_ms"],
                    cloud["rtt_ms"],
                    edge.get("total_time_ms"),
                    cloud.get("total_time_ms"),
                    edge.get("processing_time_ms"),
                    cloud.get("processing_time_ms"),
                    edge.get("network_time_ms"),
                    cloud.get("network_time_ms")
                ])

            if seq != args.count:
                await asyncio.sleep(args.interval)

    # ---- FINAL SUMMARY ----
    avg_edge = sum(edge_rtts) / len(edge_rtts) if edge_rtts else 0
    avg_cloud = sum(cloud_rtts) / len(cloud_rtts) if cloud_rtts else 0

    summary = {
        "edge_avg_rtt_ms": round(avg_edge, 2),
        "cloud_avg_rtt_ms": round(avg_cloud, 2),
    }

    print("\n===== FINAL SUMMARY =====")
    print(json.dumps(summary, indent=2))


# ---------------- CLI ----------------
def main():
    parser = argparse.ArgumentParser(description="FYP Controller Benchmark (CSV Version)")

    parser.add_argument("--edge-url", required=True)
    parser.add_argument("--cloud-url", required=True)
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--interval", type=float, default=1.0)
    parser.add_argument("--timeout", type=float, default=3.0)

    parser.add_argument(
        "--profile",
        choices=["small", "medium", "large"],
        default="small",
    )

    parser.add_argument("--benchmark", action="store_true")

    args = parser.parse_args()

    asyncio.run(run_loop(args))


if __name__ == "__main__":
    main()
