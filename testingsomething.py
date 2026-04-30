import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("fyp-firebase-server-firebase-adminsdk-fbsvc-4a488ddc8a.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

print("PROJECT:", db.project)

print("\n--- COLLECTIONS ---")

for col in db.collections():
    print("Collection:", col.id)

    docs = col.stream()
    for doc in docs:
        print("  Doc:", doc.id)
        print("  Data:", doc.to_dict())
