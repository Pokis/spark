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

  it('preserves completion-shifted schedules in portable backups', () => {
    const parsed = parseBackupText(JSON.stringify({
      ...base,
      settings: {
        ...defaultSettings,
        actionSizesEnabled: true,
        focusToolEnabled: true
      },
      habits: [{
        id: 'vitamins',
        title: 'Take vitamins',
        color: '#20B8B2',
        icon: '💊',
        variants: [{ id: 'done', kind: 'standard', label: 'Take vitamins', targetMinutes: 1, reward: 1 }],
        schedule: { type: 'afterCompletion', everyDays: 3, anchorDate: '2026-07-20' },
        reminderEnabled: false,
        priority: 2,
        contexts: ['anywhere'],
        createdAt: '2026-07-20T09:00:00.000Z',
        sortOrder: 0
      }]
    }));
    expect(parsed.habits[0]?.schedule).toEqual({
      type: 'afterCompletion',
      everyDays: 3,
      anchorDate: '2026-07-20'
    });
    expect(parsed.settings.actionSizesEnabled).toBe(true);
    expect(parsed.settings.focusToolEnabled).toBe(true);
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
      friction: { firstStep: 'Open the book' },
      momentum: {
        enabled: true,
        cadence: 'everyOtherDay',
        anchorDate: '2026-07-01',
        protections: [{ windowStart: '2026-07-03', kind: 'flex' }]
      }
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
    expect(parsed.habits[0]?.momentum).toEqual(habit.momentum);
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

  it('rejects duplicate or misaligned Momentum protection windows', () => {
    const momentumHabit = {
      id: 'habit',
      title: 'Read',
      color: '#ffffff',
      icon: '📚',
      variants: [
        { id: 'variant', kind: 'tiny', label: 'One line', targetMinutes: 1, reward: 1 }
      ],
      schedule: { type: 'daily' },
      reminderWindow: 'exact',
      reminderEnabled: false,
      priority: 1,
      contexts: ['home'],
      createdAt: '2026-07-01T00:00:00.000Z',
      sortOrder: 0,
      momentum: {
        enabled: true,
        cadence: 'everyOtherDay',
        anchorDate: '2026-07-01',
        protections: [{ windowStart: '2026-07-02', kind: 'flex' }]
      }
    };
    expect(() =>
      parseBackupText(JSON.stringify({ ...base, habits: [momentumHabit] }))
    ).toThrow('not on a window boundary');
    expect(() =>
      parseBackupText(
        JSON.stringify({
          ...base,
          habits: [
            {
              ...momentumHabit,
              momentum: {
                ...momentumHabit.momentum,
                protections: [
                  { windowStart: '2026-07-03', kind: 'flex' },
                  { windowStart: '2026-07-03', kind: 'delay' }
                ]
              }
            }
          ]
        })
      )
    ).toThrow('two Momentum protections');
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

  it('rejects duplicate entity IDs and missing variant references', () => {
    const habit = {
      id: 'habit',
      title: 'Read',
      color: '#fff',
      icon: '📚',
      variants: [
        {
          id: 'tiny',
          kind: 'tiny',
          label: 'One line',
          targetMinutes: 1,
          reward: 1
        }
      ],
      schedule: { type: 'daily' },
      reminderEnabled: false,
      priority: 1,
      contexts: ['anywhere'],
      createdAt: '2026-07-01T00:00:00.000Z',
      sortOrder: 0
    };
    expect(() =>
      parseBackupText(JSON.stringify({ ...base, habits: [habit, habit] }))
    ).toThrow('duplicate habit ID');
    expect(() =>
      parseBackupText(
        JSON.stringify({
          ...base,
          habits: [habit],
          completions: [
            {
              id: 'completion',
              habitId: 'habit',
              variantId: 'missing',
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
    ).toThrow('habit version that is missing');
  });

  it('rejects invalid weekly, departure, experiment, and routine references', () => {
    const cases = [
      {
        weeklyPlans: [
          {
            id: 'week',
            weekStart: '2026-07-13',
            selectedHabitIds: ['missing'],
            reflection: '',
            tomorrowContext: null,
            tomorrowTinyHabitId: null,
            createdAt: '2026-07-16T12:00:00.000Z'
          }
        ],
        message: 'weekly plan'
      },
      {
        departurePlans: [
          {
            id: 'departure',
            title: 'Leave',
            targetAt: '2026-07-16T13:00:00.000Z',
            bufferMinutes: 10,
            routineId: 'missing',
            status: 'planned',
            createdAt: '2026-07-16T12:00:00.000Z',
            completedAt: null
          }
        ],
        message: 'departure plan'
      },
      {
        personalExperiments: [
          {
            id: 'experiment',
            kind: 'tiny_week',
            habitId: 'missing',
            startedAt: '2026-07-16T12:00:00.000Z',
            endsAt: '2026-07-23T12:00:00.000Z',
            status: 'active',
            baselineStart: '2026-07-09',
            baselineEnd: '2026-07-15',
            note: ''
          }
        ],
        message: 'personal experiment'
      },
      {
        routineRuns: [
          {
            routineId: 'missing',
            stepIndex: 0,
            tiny: false,
            paused: false,
            skippedStepIds: [],
            startedAt: '2026-07-16T12:00:00.000Z',
            updatedAt: '2026-07-16T12:00:00.000Z'
          }
        ],
        message: 'routine'
      }
    ];
    for (const item of cases) {
      const { message, ...override } = item;
      expect(() =>
        parseBackupText(JSON.stringify({ ...base, ...override }))
      ).toThrow(message);
    }
  });

  it('rejects reversed plan and experiment dates', () => {
    expect(() =>
      parseBackupText(
        JSON.stringify({
          ...base,
          departurePlans: [
            {
              id: 'departure',
              title: 'Leave',
              targetAt: '2026-07-16T13:00:00.000Z',
              bufferMinutes: 10,
              routineId: null,
              status: 'complete',
              createdAt: '2026-07-16T12:00:00.000Z',
              completedAt: '2026-07-16T11:00:00.000Z'
            }
          ]
        })
      )
    ).toThrow('reversed completion dates');
  });
});
