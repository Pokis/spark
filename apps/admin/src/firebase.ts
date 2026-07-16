import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User
} from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined
};

export function firebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

function auth() {
  if (!firebaseConfigured()) throw new Error('Firebase is not configured.');
  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}

export function watchUser(callback: (user: User | null) => void) {
  if (!firebaseConfigured()) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth(), callback);
}

export async function signIn(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(auth(), provider);
}

export async function logOut(): Promise<void> {
  await signOut(auth());
}

export async function adminToken(): Promise<string> {
  const user = auth().currentUser;
  if (!user) throw new Error('Sign in first.');
  return user.getIdToken();
}
