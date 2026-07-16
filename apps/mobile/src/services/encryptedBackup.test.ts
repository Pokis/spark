jest.mock('expo-crypto', () => ({
  getRandomBytes: (length: number) =>
    Uint8Array.from({ length }, (_, index) => (index * 17 + 11) % 256)
}));

import { defaultSettings, type AppSnapshot } from '../data/models';
import {
  createEncryptedBackupText,
  parseEncryptedBackupText
} from './backup';

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
});

