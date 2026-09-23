import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Read Firebase configurations from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if credentials have been filled out
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  !firebaseConfig.apiKey.includes('your_api_key_here')
);

// Initialize Firebase only if config is provided, else provide fallback handles
let app = null;
let auth = null;
let db = null;
let storage = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (err) {
    console.warn('[Firebase] Initialization warning:', err);
  }
}

// Primary allowed couple whitelist
export const DEFAULT_ALLOWED_EMAILS = [
  'hers.jit@gmail.com',
  'his.saini.gulu@gmail.com',
];

// Parse allowed emails list (normalized to lower-case)
export const rawAllowedEmails = import.meta.env.VITE_ALLOWED_EMAILS || '';
export const ALLOWED_EMAILS = Array.from(
  new Set([
    ...DEFAULT_ALLOWED_EMAILS,
    ...rawAllowedEmails
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  ])
);

/**
 * Checks if a given email is strictly present in the allowed couple whitelist.
 * @param {string} email
 * @returns {boolean}
 */
export function isAllowedEmail(email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ALLOWED_EMAILS.includes(normalized);
}

export { app, auth, db, storage };
