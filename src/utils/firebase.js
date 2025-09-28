// Lightweight Firebase bootstrap. Reads config from Vite env vars.
// Required env vars when using Firebase provider:
// - VITE_FIREBASE_API_KEY
// - VITE_FIREBASE_AUTH_DOMAIN
// - VITE_FIREBASE_PROJECT_ID
// - VITE_FIREBASE_STORAGE_BUCKET
// - VITE_FIREBASE_APP_ID
// Optional: VITE_FIREBASE_MESSAGING_SENDER_ID

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export function ensureFirebase() {
  if (getApps().length) return getApps()[0];
  const cfg = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  // Minimal validation
  if (!cfg.apiKey || !cfg.projectId) {
    throw new Error('Firebase config missing. Set VITE_FIREBASE_* env vars.');
  }
  return initializeApp(cfg);
}

export function getFb() {
  const app = ensureFirebase();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  return { app, auth, db, storage };
}

export default getFb;

