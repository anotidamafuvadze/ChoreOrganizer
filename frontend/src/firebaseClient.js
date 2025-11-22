import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
} from "firebase/auth";

// Helper to read and sanitize env vars (Vite exposes VITE_ prefixed vars)
const raw = (k) => import.meta.env[k] ?? import.meta.env["REACT_APP_" + k];
const sanitize = (v) => {
  if (v === undefined || v === null) return undefined;
  let s = String(v).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1);
  }
  return s;
};

const firebaseConfig = {
  apiKey: sanitize(
    raw("VITE_FIREBASE_API_KEY") ?? raw("REACT_APP_FIREBASE_API_KEY")
  ),
  authDomain: sanitize(
    raw("VITE_FIREBASE_AUTH_DOMAIN") ?? raw("REACT_APP_FIREBASE_AUTH_DOMAIN")
  ),
  projectId: sanitize(
    raw("VITE_FIREBASE_PROJECT_ID") ?? raw("REACT_APP_FIREBASE_PROJECT_ID")
  ),
  storageBucket: sanitize(
    raw("VITE_FIREBASE_STORAGE_BUCKET") ??
      raw("REACT_APP_FIREBASE_STORAGE_BUCKET")
  ),
  messagingSenderId: sanitize(
    raw("VITE_FIREBASE_MESSAGING_SENDER_ID") ??
      raw("REACT_APP_FIREBASE_MESSAGING_SENDER_ID")
  ),
  appId: sanitize(
    raw("VITE_FIREBASE_APP_ID") ?? raw("REACT_APP_FIREBASE_APP_ID")
  ),
};

if (!firebaseConfig.apiKey) {
  console.error(
    "Firebase API key missing. Ensure VITE_FIREBASE_API_KEY or REACT_APP_FIREBASE_API_KEY is set (no quotes) in frontend/.env"
  );
}

// Initialize Firebase only if apiKey present (avoid runtime crash during dev if env is missing)
let app;
let auth = null;
let provider = null;

if (firebaseConfig.apiKey) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth();
    provider = new GoogleAuthProvider();
  } catch (e) {
    console.error("Firebase init error", e);
  }
} else {
  // Helpful console message has already been logged above; keep auth null
}

export async function signInWithGoogle() {
  if (!auth || !provider) {
    throw new Error(
      "Firebase is not configured. Set VITE_FIREBASE_API_KEY (no quotes) in frontend/.env and restart dev server."
    );
  }
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export function signOut() {
  if (!auth) throw new Error("Firebase is not configured.");
  return fbSignOut(auth);
}

export function onAuthChange(cb) {
  if (!auth) {
    // return a no-op unsubscribe to keep caller code simple
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export { auth };
