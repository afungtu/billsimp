// src/firebase/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAscZO4xyQdCfhUotZHZxjWU7JCuZe1Xdw",
  authDomain: "billsimp-2fd79.firebaseapp.com",
  projectId: "billsimp-2fd79",
  storageBucket: "billsimp-2fd79.firebasestorage.app",
  messagingSenderId: "792777531152",
  appId: "1:792777531152:web:95374160bf4704bdad0f95"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
