import { defaultSettings } from '../data/models';
import { parseBackupText } from './backup';

const base = {
  schemaVersion: 2,
  exportedAt: '2026-07-16T12:00:00.000Z',
  habits: [],
  completions: [],
  focusSessions: [],
  captureItems: [],
  routines: [],
  dailyCheckIns: [],
  settings: defaultSettings
};

describe('backup validation', () => {
  it('accepts a current empty snapshot', () => {
    expect(parseBackupText(JSON.stringify(base)).schemaVersion).toBe(2);
  });

  it('migrates legacy settings and pause fields', () => {
    const legacy = {
      ...base,
      schemaVersion: 1,
      settings: {
        onboardingComplete: true,
        displayName: '',
        reducedMotion: false,
        hapticsEnabled: true,
        soundsEnabled: true,
        highContrast: false,
        supporterThemeEnabled: false,
        notificationsEnabled: false,
        notificationCap: 4,
        defaultFocusMinutes: 10,
        cloudSupportEnabled: false
      }
    };
    const parsed = parseBackupText(JSON.stringify(legacy));
    expect(parsed.settings.sensoryProfile).toBe('balanced');
    expect(parsed.settings.minimumViableDay).toBe(false);
  });

  it('rejects malformed JSON and future versions', () => {
    expect(() => parseBackupText('{')).toThrow('valid JSON');
    expect(() =>
      parseBackupText(JSON.stringify({ ...base, schemaVersion: 99 }))
    ).toThrow('not supported');
  });

  it('rejects completion references to missing habits', () => {
    expect(() =>
      parseBackupText(
        JSON.stringify({
          ...base,
          completions: [
            {
              id: 'completion',
              habitId: 'missing',
              variantId: 'variant',
              variantKind: 'tiny',
              reward: 1,
              occurredAt: '2026-07-16T12:00:00.000Z',
              loggedAt: '2026-07-16T12:00:00.000Z',
              localDate: '2026-07-16',
              source: 'today'
            }
          ]
        })
      )
    ).toThrow('habit that is missing');
  });
});
