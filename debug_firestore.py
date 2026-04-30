import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("fyp-firebase-server-firebase-adminsdk-fbsvc-4a488ddc8a.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

print("PROJECT:", db.project)

print("\n--- COLLECTION TEST ---")

docs = db.collection("jobs").stream()

count = 0

for doc in docs:
    count += 1
    print("DOC:", doc.id)
    print(doc.to_dict())

print("\nTOTAL DOCS:", count)
