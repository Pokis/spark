jest.mock('expo-crypto', () => ({
  getRandomBytes: (length: number) =>
    Uint8Array.from({ length }, (_, index) => (index * 17 + 11) % 256)
}));

import { defaultSettings, type AppSnapshot } from '../data/models';
import * as SecureStore from 'expo-secure-store';
import {
  createEncryptedBackupText,
  ensureBackupRecoveryCode,
  getBackupRecoveryCode,
  rotateBackupRecoveryCode,
  parseEncryptedBackupText
} from './backup';

jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked-this-device-only',
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      values.delete(key);
    }),
    __clear: () => values.clear()
  };
});

const snapshot: AppSnapshot = {
  schemaVersion: 4,
  exportedAt: '2026-07-16T12:00:00.000Z',
  habits: [],
  completions: [],
  focusSessions: [],
  captureItems: [],
  routines: [],
  dailyCheckIns: [],
  habitDeferrals: [],
  routineRuns: [],
  weeklyPlans: [],
  departurePlans: [],
  personalExperiments: [],
  settings: defaultSettings
};

describe('encrypted backups', () => {
  beforeEach(() => {
    (SecureStore as any).__clear();
    jest.clearAllMocks();
  });

  it('round-trips with the correct password and rejects a wrong password', async () => {
    const encrypted = await createEncryptedBackupText(
      snapshot,
      'correct horse battery staple'
    );
    await expect(
      parseEncryptedBackupText(encrypted, 'correct horse battery staple')
    ).resolves.toMatchObject({ schemaVersion: 4, habits: [] });
    await expect(
      parseEncryptedBackupText(encrypted, 'wrong password')
    ).rejects.toThrow('did not unlock');
  });

  it('authenticates metadata and ciphertext', async () => {
    const encrypted = await createEncryptedBackupText(
      snapshot,
      'correct horse battery staple'
    );
    const envelope = JSON.parse(encrypted) as {
      cipher: { ciphertext: string };
    };
    envelope.cipher.ciphertext =
      envelope.cipher.ciphertext.slice(0, -2) + 'AA';
    await expect(
      parseEncryptedBackupText(
        JSON.stringify(envelope),
        'correct horse battery staple'
      )
    ).rejects.toThrow('did not unlock');
  });

  it('rejects weak secrets and malformed envelopes before restore', async () => {
    await expect(createEncryptedBackupText(snapshot, 'too short')).rejects.toThrow(
      'at least 10 characters'
    );
    await expect(
      parseEncryptedBackupText('not-json', 'correct horse battery staple')
    ).rejects.toThrow('not a Spark encrypted backup');
    await expect(
      parseEncryptedBackupText(
        JSON.stringify({ format: 'another-format' }),
        'correct horse battery staple'
      )
    ).rejects.toThrow();
  });

  it('authenticates creation metadata, not only ciphertext', async () => {
    const encrypted = JSON.parse(
      await createEncryptedBackupText(
        snapshot,
        'correct horse battery staple'
      )
    );
    encrypted.createdAt = '2026-07-17T12:00:00.000Z';
    await expect(
      parseEncryptedBackupText(
        JSON.stringify(encrypted),
        'correct horse battery staple'
      )
    ).rejects.toThrow('did not unlock');
  });

  it('generates, reuses, and rotates a device-only recovery code', async () => {
    const first = await ensureBackupRecoveryCode();
    expect(first).toMatch(/^[A-Z2-9]{4}(?:-[A-Z2-9]{4})+$/);
    expect(await getBackupRecoveryCode()).toBe(first);
    expect(await ensureBackupRecoveryCode()).toBe(first);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      expect.any(String),
      first,
      expect.objectContaining({
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
      })
    );
    const rotated = await rotateBackupRecoveryCode();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    // expo-crypto is deterministic in tests, so rotation validates lifecycle,
    // not random inequality.
    expect(await getBackupRecoveryCode()).toBe(rotated);
  });
});
