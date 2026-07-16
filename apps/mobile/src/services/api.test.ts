import Constants from 'expo-constants';
import { idToken, forgetCloudSession } from './cloudAuth';
import {
  createSupportThread,
  deleteCloudIdentity,
  fetchConfig,
  getEntitlement,
  listSupportMessages,
  listSupportThreads,
  sendSupportMessage,
  verifyGooglePurchase
} from './api';
import { defaultAppConfig } from '@spark/cloud-contracts';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { sparkApiUrl: 'https://spark.example.test/' } }
  }
}));

jest.mock('./cloudAuth', () => ({
  idToken: jest.fn(async () => 'token'),
  forgetCloudSession: jest.fn(async () => undefined)
}));

function response(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: jest.fn(async () => body)
  } as any;
}

describe('mobile cloud API boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    (Constants.expoConfig!.extra as any).sparkApiUrl =
      'https://spark.example.test/';
  });

  it('fetches public config without creating a cloud identity', async () => {
    (fetch as jest.Mock).mockResolvedValue(response(defaultAppConfig));
    await expect(fetchConfig()).resolves.toEqual(defaultAppConfig);
    expect(fetch).toHaveBeenCalledWith(
      'https://spark.example.test/v1/config',
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
    const headers = (fetch as jest.Mock).mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
    expect(idToken).not.toHaveBeenCalled();
  });

  it('uses authenticated, encoded, JSON support routes', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ id: 'thread' }, true, 201))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ id: 'message' }, true, 201));
    await listSupportThreads();
    await createSupportThread({
      subject: 'Help',
      message: 'I am stuck',
      appVersion: '0.1.0',
      platform: 'android'
    });
    await listSupportMessages('thread/with spaces');
    await sendSupportMessage('thread/with spaces', 'Reply');
    expect(idToken).toHaveBeenCalledTimes(4);
    const messageCall = (fetch as jest.Mock).mock.calls[3];
    expect(messageCall[0]).toContain('thread%2Fwith%20spaces/messages');
    expect(messageCall[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ text: 'Reply' })
    });
    expect((messageCall[1].headers as Headers).get('Authorization')).toBe(
      'Bearer token'
    );
    expect((messageCall[1].headers as Headers).get('Content-Type')).toBe(
      'application/json'
    );
  });

  it('verifies purchases and reads entitlements through the authenticated API', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce(
        response({ premium: true, source: 'play', expiresAt: null })
      )
      .mockResolvedValueOnce(
        response({ premium: true, source: 'play', expiresAt: null })
      );
    await expect(
      verifyGooglePurchase('spark_premium_lifetime', 'token', true)
    ).resolves.toMatchObject({ premium: true });
    expect((fetch as jest.Mock).mock.calls[0][1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({
        productId: 'spark_premium_lifetime',
        purchaseToken: 'token',
        restore: true
      })
    });
    await expect(getEntitlement()).resolves.toMatchObject({ premium: true });
  });

  it('surfaces server messages, generic HTTP errors, and missing configuration', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce(response({ message: 'Feature is off.' }, false, 503))
      .mockResolvedValueOnce(response(null, false, 500));
    await expect(listSupportThreads()).rejects.toThrow('Feature is off.');
    await expect(listSupportThreads()).rejects.toThrow(
      'Spark service request failed (500)'
    );
    (Constants.expoConfig!.extra as any).sparkApiUrl = '';
    await expect(listSupportThreads()).rejects.toThrow(
      'cloud services are not configured'
    );
  });

  it('forgets the local cloud session only after remote deletion succeeds', async () => {
    (fetch as jest.Mock).mockResolvedValue(response(null, true, 204));
    await deleteCloudIdentity();
    expect(forgetCloudSession).toHaveBeenCalledTimes(1);
    (fetch as jest.Mock).mockResolvedValue(
      response({ message: 'Delete failed' }, false, 500)
    );
    await expect(deleteCloudIdentity()).rejects.toThrow('Delete failed');
    expect(forgetCloudSession).toHaveBeenCalledTimes(1);
  });
});
