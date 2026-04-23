// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCLoHe0z9PjKWPnSqs1LpsCZAXaS1sSjiI",
  authDomain: "notaryxpert-db.firebaseapp.com",
  projectId: "notaryxpert-db",
  storageBucket: "notaryxpert-db.firebasestorage.app",
  messagingSenderId: "987300132585",
  appId: "1:987300132585:web:b61c31254c25601ca1e278"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };