import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCRLOMVGF7BU2ghpXJNTIZ7pLSrGaU31lk",
  authDomain: "lifted-app-firebase.firebaseapp.com",
  projectId: "lifted-app-firebase",
  storageBucket: "lifted-app-firebase.firebasestorage.app",
  messagingSenderId: "312913033625",
  appId: "1:312913033625:web:921b39aa8466f256577b08",
  measurementId: "G-W9WRS7N8PD"
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

// Initialize Firebase (lazy initialization to avoid issues in different environments)
export function initializeFirebase(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    db = getFirestore(initializeFirebase());
  }
  return db;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(initializeFirebase());
  }
  return auth;
}

export { app, db, auth };
