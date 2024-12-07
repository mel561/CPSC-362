import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "cpsc362-539e3.firebaseapp.com",
  projectId: "cpsc362-539e3",
  storageBucket: "cpsc362-539e3.firebasestorage.app",
  messagingSenderId: "758132212280",
  appId: "1:758132212280:web:177c25c7b45ae12e249ccd"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth()
export const db = getFirestore()
export const storage = getStorage()
export const chat = getFirestore()