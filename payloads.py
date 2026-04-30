import json
import time
import random
import string


def _pad_to_size(data_dict, target_size):
    """Pads JSON with random data until it reaches approximate target size in bytes."""
    payload = json.dumps(data_dict)
    current_size = len(payload.encode("utf-8"))

    if current_size >= target_size:
        return payload

    padding_needed = target_size - current_size
    padding_string = ''.join(random.choices(string.ascii_letters, k=padding_needed))

    data_dict["padding"] = padding_string
    return json.dumps(data_dict)


def generate_payload(size_type):
    base_data = {
        "device_id": "sensor-001",
        "timestamp": int(time.time()),
        "sequence": random.randint(1, 1000000),
    }

    if size_type == "small":
        base_data["metrics"] = {
            "temperature": random.uniform(20, 30),
            "humidity": random.uniform(40, 60),
            "pressure": random.uniform(1000, 1020),
        }
        return _pad_to_size(base_data, 512)

    elif size_type == "medium":
        base_data["events"] = [
            {"value": random.random(), "status": "ok"}
            for _ in range(200)
        ]
        return _pad_to_size(base_data, 10 * 1024)

    elif size_type == "large":
        base_data["data_block"] = [
            random.random() for _ in range(5000)
        ]
        return _pad_to_size(base_data, 250 * 1024)

    else:
        raise ValueError("Invalid payload size")

