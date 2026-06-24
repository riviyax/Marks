import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
// Only Google sign-in is configured — no other providers are wired up.
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Some browser/Chrome COOP configurations prevent Firebase's popup flow
// from detecting that the Google popup closed (a known Firebase + Chrome
// interaction, unrelated to anything our own server sends). When that
// happens, the popup completes on Google's side but the promise on our
// side never resolves or rejects — so we can't rely on a try/catch alone.
// Instead we race the popup against a short timeout and fall back to a
// full-page redirect if it hasn't settled in time.
const POPUP_TIMEOUT_MS = 12000;

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('popup-timeout')), ms));
}

export async function signInWithGoogle() {
  const userCancelledCodes = new Set([
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request',
  ]);

  try {
    const result = await Promise.race([
      signInWithPopup(auth, googleProvider),
      timeout(POPUP_TIMEOUT_MS),
    ]);
    return result.user;
  } catch (err) {
    if (userCancelledCodes.has(err?.code)) {
      throw err; // user closed it themselves — don't redirect, just let them retry
    }
    // Either a real popup error (blocked, unsupported) or our timeout fired
    // because the popup is stuck due to the COOP/window-close issue.
    // Fall back to a full-page redirect, which doesn't depend on the
    // opener/popup relationship at all.
    await signInWithRedirect(auth, googleProvider);
    return null; // page will navigate away; result is handled by getRedirectResult on reload
  }
}

// Forces the redirect flow directly, skipping the popup attempt entirely.
// Useful as a manual "Trouble signing in?" fallback in the UI.
export async function signInWithGoogleRedirect() {
  await signInWithRedirect(auth, googleProvider);
}

// Call once on app load to pick up the result of a redirect-based sign-in.
export async function consumeRedirectResult() {
  const result = await getRedirectResult(auth);
  return result?.user || null;
}

export async function signOutUser() {
  await signOut(auth);
}

