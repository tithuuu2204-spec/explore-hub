import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmZuV0HUYxDApirBKfvLYJu0FhVjwFgMA", // Copy this from your Firebase Project Settings
  authDomain: "explore-hub-fca42.firebaseapp.com",
  projectId: "explore-hub-fca42",
  storageBucket: "explore-hub-fca42.appspot.com",
  messagingSenderId: "774065190334",
  appId: "1:774065190334:web:7139101626165cf801b5ef"     // Copy this from your Firebase Project Settings
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);