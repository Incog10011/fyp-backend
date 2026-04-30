from payloads import generate_payload

for size in ["small", "medium", "large"]:
    payload = generate_payload(size)
    print(size, len(payload.encode("utf-8")))

