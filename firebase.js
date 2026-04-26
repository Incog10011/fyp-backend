import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "fyp-firebase-server.firebaseapp.com",
  projectId: "fyp-firebase-server",
  storageBucket: "fyp-firebase-server.firebasestorage.app",
  messagingSenderId: "869791125735",
  appId: "1:869791125735:web:5a594589dac0460fe39242"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
