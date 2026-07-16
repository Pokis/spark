import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'spark.firebase.rest-session.v1';

interface RestSession {
  idToken: string;
  refreshToken: string;
  localId: string;
  expiresAt: number;
}

function firebaseApiKey(): string {
  const firebase = (Constants.expoConfig?.extra?.firebase || {}) as Record<string, string>;
  return firebase.apiKey || '';
}

export function cloudIdentityConfigured(): boolean {
  return Boolean(firebaseApiKey());
}

async function readSession(): Promise<RestSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RestSession;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
}

async function writeSession(session: RestSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

async function createAnonymousSession(): Promise<RestSession> {
  const key = firebaseApiKey();
  if (!key) throw new Error('Cloud identity is not configured.');
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true })
    }
  );
  const body = (await response.json()) as {
    idToken?: string;
    refreshToken?: string;
    localId?: string;
    expiresIn?: string;
    error?: { message?: string };
  };
  if (!response.ok || !body.idToken || !body.refreshToken || !body.localId) {
    throw new Error(body.error?.message ?? 'Could not create a private support identity.');
  }
  const session: RestSession = {
    idToken: body.idToken,
    refreshToken: body.refreshToken,
    localId: body.localId,
    expiresAt: Date.now() + Number(body.expiresIn ?? 3600) * 1000
  };
  await writeSession(session);
  return session;
}

async function refreshSession(session: RestSession): Promise<RestSession> {
  const key = firebaseApiKey();
  const response = await fetch(
    `https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken
      }).toString()
    }
  );
  const body = (await response.json()) as {
    id_token?: string;
    refresh_token?: string;
    user_id?: string;
    expires_in?: string;
    error?: { message?: string };
  };
  if (!response.ok || !body.id_token || !body.refresh_token || !body.user_id) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    throw new Error(body.error?.message ?? 'The private support session expired.');
  }
  const refreshed: RestSession = {
    idToken: body.id_token,
    refreshToken: body.refresh_token,
    localId: body.user_id,
    expiresAt: Date.now() + Number(body.expires_in ?? 3600) * 1000
  };
  await writeSession(refreshed);
  return refreshed;
}

async function currentSession(): Promise<RestSession> {
  const existing = await readSession();
  if (!existing) return createAnonymousSession();
  if (existing.expiresAt - Date.now() > 5 * 60 * 1000) return existing;
  return refreshSession(existing);
}

export async function idToken(): Promise<string> {
  return (await currentSession()).idToken;
}

export async function cloudUserId(): Promise<string | null> {
  return (await currentSession()).localId;
}

export async function forgetCloudSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
