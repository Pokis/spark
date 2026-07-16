import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User
} from 'firebase/auth';

const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
const config = {
  apiKey:
    (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) ??
    (useEmulators ? 'demo-api-key' : undefined),
  authDomain:
    (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ??
    (useEmulators ? 'demo-spark-local.firebaseapp.com' : undefined),
  projectId:
    (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) ??
    (useEmulators ? 'demo-spark-local' : undefined),
  appId:
    (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) ??
    (useEmulators ? '1:000000000000:web:spark-local' : undefined)
};
let emulatorConnected = false;

export function firebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

function auth() {
  if (!firebaseConfigured()) throw new Error('Firebase is not configured.');
  const app = getApps().length ? getApp() : initializeApp(config);
  const instance = getAuth(app);
  if (useEmulators && !emulatorConnected) {
    connectAuthEmulator(
      instance,
      (import.meta.env.VITE_AUTH_EMULATOR_URL as string | undefined) ??
        'http://127.0.0.1:9099',
      { disableWarnings: true }
    );
    emulatorConnected = true;
  }
  return instance;
}

export function watchUser(callback: (user: User | null) => void) {
  if (!firebaseConfigured()) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth(), callback);
}

export async function signIn(): Promise<void> {
  if (useEmulators) {
    await signInWithEmailAndPassword(
      auth(),
      (import.meta.env.VITE_EMULATOR_EMAIL as string | undefined) ??
        'owner@spark.local',
      (import.meta.env.VITE_EMULATOR_PASSWORD as string | undefined) ??
        'SparkLocalOnly123!'
    );
    return;
  }
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
