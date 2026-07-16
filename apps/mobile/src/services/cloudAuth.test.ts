import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import {
  cloudIdentityConfigured,
  cloudUserId,
  forgetCloudSession,
  idToken
} from './cloudAuth';

const mockValues = new Map<string, string>();

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { firebase: { apiKey: 'firebase-key' } } }
  }
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: jest.fn(async (key: string) => mockValues.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockValues.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockValues.delete(key);
  })
}));

function response(body: unknown, ok = true) {
  return { ok, json: jest.fn(async () => body) } as any;
}

describe('anonymous cloud identity lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-16T12:00:00.000Z'));
    mockValues.clear();
    global.fetch = jest.fn();
    (Constants.expoConfig!.extra as any).firebase.apiKey = 'firebase-key';
  });

  afterEach(() => jest.useRealTimers());

  it('stays unconfigured until a Firebase API key is supplied', async () => {
    (Constants.expoConfig!.extra as any).firebase.apiKey = '';
    expect(cloudIdentityConfigured()).toBe(false);
    await expect(idToken()).rejects.toThrow('Cloud identity is not configured');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('creates and securely caches an anonymous identity on first cloud use', async () => {
    (fetch as jest.Mock).mockResolvedValue(
      response({
        idToken: 'id-token',
        refreshToken: 'refresh-token',
        localId: 'local-id',
        expiresIn: '3600'
      })
    );
    await expect(idToken()).resolves.toBe('id-token');
    await expect(cloudUserId()).resolves.toBe('local-id');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('accounts:signUp?key=firebase-key'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('"localId":"local-id"'),
      expect.objectContaining({
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
      })
    );
  });

  it('refreshes an expiring session and deletes it when refresh fails', async () => {
    mockValues.set(
      'spark.firebase.rest-session.v1',
      JSON.stringify({
        idToken: 'old',
        refreshToken: 'refresh',
        localId: 'local',
        expiresAt: Date.now() + 60_000
      })
    );
    (fetch as jest.Mock).mockResolvedValueOnce(
      response({
        id_token: 'new',
        refresh_token: 'new-refresh',
        user_id: 'local',
        expires_in: '3600'
      })
    );
    await expect(idToken()).resolves.toBe('new');
    expect((fetch as jest.Mock).mock.calls[0][1].body).toContain(
      'refresh_token=refresh'
    );

    mockValues.set(
      'spark.firebase.rest-session.v1',
      JSON.stringify({
        idToken: 'old',
        refreshToken: 'refresh',
        localId: 'local',
        expiresAt: Date.now()
      })
    );
    (fetch as jest.Mock).mockResolvedValueOnce(
      response({ error: { message: 'TOKEN_EXPIRED' } }, false)
    );
    await expect(idToken()).rejects.toThrow('TOKEN_EXPIRED');
    expect(
      await SecureStore.getItemAsync('spark.firebase.rest-session.v1')
    ).toBeNull();
  });

  it('deletes corrupt sessions and supports explicit sign-out/deletion cleanup', async () => {
    mockValues.set('spark.firebase.rest-session.v1', '{broken');
    (fetch as jest.Mock).mockResolvedValue(
      response({
        idToken: 'new',
        refreshToken: 'refresh',
        localId: 'local',
        expiresIn: '3600'
      })
    );
    await expect(idToken()).resolves.toBe('new');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    await forgetCloudSession();
    expect(
      await SecureStore.getItemAsync('spark.firebase.rest-session.v1')
    ).toBeNull();
  });
});
