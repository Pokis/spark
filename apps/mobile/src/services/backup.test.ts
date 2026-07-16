import { defaultSettings } from '../data/models';
import { parseBackupText } from './backup';

const base = {
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

describe('backup validation', () => {
  it('accepts a current empty snapshot', () => {
    expect(parseBackupText(JSON.stringify(base)).schemaVersion).toBe(4);
  });

  it('opens and migrates every released backup schema', () => {
    const versionTwo = {
      ...base,
      schemaVersion: 2,
      habitDeferrals: undefined,
      routineRuns: undefined
    };
    expect(parseBackupText(JSON.stringify(versionTwo))).toMatchObject({
      schemaVersion: 4,
      habitDeferrals: [],
      routineRuns: [],
      weeklyPlans: [],
      departurePlans: [],
      personalExperiments: []
    });
    const versionThree = {
      ...base,
      schemaVersion: 3,
      weeklyPlans: undefined,
      departurePlans: undefined,
      personalExperiments: undefined
    };
    expect(parseBackupText(JSON.stringify(versionThree))).toMatchObject({
      schemaVersion: 4,
      weeklyPlans: [],
      departurePlans: [],
      personalExperiments: []
    });
    const legacy = {
      ...base,
      schemaVersion: 1,
      habitDeferrals: undefined,
      routineRuns: undefined,
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
    expect(parsed.schemaVersion).toBe(4);
  });

  it('preserves current deferrals, routine recovery, tags, and contexts', () => {
    const current = {
      ...base,
      routines: [
        {
          id: 'routine',
          title: 'Start work',
          icon: '💼',
          color: '#8367E8',
          createdAt: '2026-07-16T08:00:00.000Z',
          steps: [
            {
              id: 'step',
              title: 'Open document',
              tinyTitle: 'Touch laptop',
              estimateMinutes: 2,
              sortOrder: 0,
              focusMinutes: 2
            }
          ]
        }
      ],
      routineRuns: [
        {
          routineId: 'routine',
          stepIndex: 0,
          tiny: true,
          paused: true,
          skippedStepIds: [],
          startedAt: '2026-07-16T08:00:00.000Z',
          updatedAt: '2026-07-16T08:01:00.000Z'
        }
      ],
      dailyCheckIns: [
        {
          localDate: '2026-07-16',
          capacity: 'steady',
          availableMinutes: 10,
          mood: null,
          context: 'work'
        }
      ]
    };
    const parsed = parseBackupText(JSON.stringify(current));
    expect(parsed.dailyCheckIns[0]?.context).toBe('work');
    expect(parsed.routineRuns[0]).toMatchObject({ paused: true, tiny: true });
  });

  it('preserves local plans and personal experiments in schema 4', () => {
    const habit = {
      id: 'habit',
      title: 'Read',
      color: '#ffffff',
      icon: '📚',
      variants: [
        {
          id: 'variant',
          kind: 'tiny',
          label: 'Read one line',
          targetMinutes: 1,
          reward: 1
        }
      ],
      schedule: { type: 'daily' },
      reminderWindow: 'exact',
      reminderEnabled: false,
      priority: 1,
      contexts: ['anywhere'],
      createdAt: '2026-07-01T00:00:00.000Z',
      sortOrder: 0,
      friction: { firstStep: 'Open the book' }
    };
    const parsed = parseBackupText(
      JSON.stringify({
        ...base,
        habits: [habit],
        weeklyPlans: [
          {
            id: 'week',
            weekStart: '2026-07-13',
            selectedHabitIds: ['habit'],
            reflection: '',
            tomorrowContext: 'home',
            tomorrowTinyHabitId: 'habit',
            createdAt: '2026-07-16T10:00:00.000Z'
          }
        ],
        personalExperiments: [
          {
            id: 'experiment',
            kind: 'tiny_week',
            habitId: 'habit',
            startedAt: '2026-07-16T10:00:00.000Z',
            endsAt: '2026-07-23T10:00:00.000Z',
            status: 'active',
            baselineStart: '2026-07-09',
            baselineEnd: '2026-07-15',
            note: ''
          }
        ]
      })
    );
    expect(parsed.habits[0]?.friction?.firstStep).toBe('Open the book');
    expect(parsed.weeklyPlans).toHaveLength(1);
    expect(parsed.personalExperiments).toHaveLength(1);
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
