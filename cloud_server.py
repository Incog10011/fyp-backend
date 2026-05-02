from flask import Flask, request, jsonify
import time

app = Flask(__name__)

def now_ms():
    return int(time.time() * 1000)

@app.post("/ingest")
def ingest():
    t_received = now_ms()

    data = request.get_json(silent=True) or {}

    payload_size = len(request.data)

    # Simulate cloud delay (slower than edge)
    if payload_size < 1000:
        time.sleep(0.05)
    elif payload_size < 10000:
        time.sleep(0.1)
    else:
        time.sleep(0.2)

    t_processed = now_ms()

    return jsonify({
        "ok": True,
        "seq": data.get("seq"),
        "t_received": t_received,
        "t_processed": t_processed
    })

app.run(host="0.0.0.0", port=5000)
