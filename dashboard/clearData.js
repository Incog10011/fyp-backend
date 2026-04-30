import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "fyp-firebase-server.firebaseapp.com",
  projectId: "fyp-firebase-server",
  storageBucket: "fyp-firebase-server.firebasestorage.app",
  messagingSenderId: "869791125735",
  appId: "1:869791125735:web:5a594589dac0460fe39242"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearSynthetic() {
  const snapshot = await getDocs(collection(db, "jobs"));

  let count = 0;

  for (const d of snapshot.docs) {
    const data = d.data();

    if (data.scenario === "synthetic") {
      await deleteDoc(doc(db, "jobs", d.id));
      count++;
    }
  }

  console.log(`✅ Deleted ${count} synthetic documents`);
}

clearSynthetic();
