import { act, render, waitFor } from '@testing-library/react-native';
import type { Completion, FocusSession, Habit, Routine } from '@spark/domain';
import { Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Database from '../data/database';
import {
  defaultEntitlement,
  defaultSettings,
  type WeeklyPlan
} from '../data/models';
import { writeAutomaticEncryptedBackup } from '../services/backup';
import { rescheduleHabitNotifications, snoozeHabit } from '../services/notifications';
import {
  syncFocusWidget,
  syncRoutineWidget,
  syncTodayWidget
} from '../services/widget';
import { SparkProvider, useSpark } from './SparkProvider';

const mockHabit: Habit = {
  id: 'habit',
  title: 'Read',
  color: '#fff',
  icon: '📚',
  variants: [
    { id: 'tiny', kind: 'tiny', label: 'One line', targetMinutes: 1, reward: 1 }
  ],
  schedule: { type: 'daily' },
  reminderEnabled: false,
  priority: 1,
  contexts: ['anywhere'],
  createdAt: '2026-07-01T00:00:00.000Z',
  sortOrder: 0
};

const mockRoutine: Routine = {
  id: 'routine',
  title: 'Start work',
  icon: '💼',
  color: '#fff',
  createdAt: '2026-07-01T00:00:00.000Z',
  steps: [
    { id: 'step', title: 'Open file', estimateMinutes: 2, sortOrder: 0 }
  ]
};

let mockData: any;
let mockNotificationResponse:
  | ((response: any) => void)
  | undefined;

jest.mock('../data/database', () => ({
  deleteCaptureItem: jest.fn(async () => undefined),
  deleteCompletion: jest.fn(async () => undefined),
  deleteHabitDeferral: jest.fn(async () => undefined),
  deleteRoutineRun: jest.fn(async () => undefined),
  insertCaptureItem: jest.fn(async () => undefined),
  insertCompletion: jest.fn(async () => undefined),
  insertFocusSession: jest.fn(async () => undefined),
  loadAppData: jest.fn(async () => mockData),
  loadCompletionInsights: jest.fn(async () => ({
    completionTotals: { totalWins: 1, totalSparks: 1 },
    completionDailySummaries: []
  })),
  purgeExpiredHabitDeferrals: jest.fn(async () => undefined),
  saveCheckIn: jest.fn(async () => undefined),
  saveEntitlement: jest.fn(async () => undefined),
  saveHabitDeferral: jest.fn(async () => undefined),
  saveDeparturePlan: jest.fn(async () => undefined),
  savePersonalExperiment: jest.fn(async () => undefined),
  saveRoutineRun: jest.fn(async () => undefined),
  saveSetting: jest.fn(async () => undefined),
  saveWeeklyPlan: jest.fn(async () => undefined),
  updateCompletionTags: jest.fn(async () => undefined),
  upsertHabit: jest.fn(async () => undefined),
  upsertRoutine: jest.fn(async () => undefined)
}));

jest.mock('../services/cloudConfig', () => ({
  loadAppConfig: jest.fn(async () => {
    const { defaultAppConfig } = require('@spark/cloud-contracts');
    return defaultAppConfig;
  })
}));

jest.mock('../services/backup', () => ({
  writeAutomaticEncryptedBackup: jest.fn(async () => 'backup')
}));

jest.mock('../services/diagnostics', () => ({
  reportError: jest.fn(async () => undefined),
  runSafely: (_context: string, task: () => Promise<unknown>) => {
    void task().catch(() => undefined);
  }
}));

jest.mock('../services/notifications', () => ({
  notificationActionKind: (identifier: string) =>
    identifier === 'spark-tiny'
      ? 'log_tiny'
      : identifier === 'spark-snooze'
        ? 'snooze'
        : identifier === 'spark-quiet-today'
          ? 'quiet_today'
          : 'open',
  rescheduleHabitNotifications: jest.fn(async () => undefined),
  snoozeHabit: jest.fn(async () => undefined)
}));

jest.mock('../services/widget', () => ({
  syncTodayWidget: jest.fn(async () => undefined),
  syncFocusWidget: jest.fn(async () => undefined),
  syncRoutineWidget: jest.fn(async () => undefined)
}));

jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn((callback) => {
    mockNotificationResponse = callback;
    return { remove: jest.fn() };
  })
}));

jest.mock('expo-sharing', () => ({
  getSharedPayloads: jest.fn(() => []),
  clearSharedPayloads: jest.fn()
}));

function initialData(settings = defaultSettings) {
  return {
    habits: [mockHabit],
    completions: [],
    completionTotals: { totalWins: 0, totalSparks: 0 },
    completionDailySummaries: [],
    focusSessions: [],
    captureItems: [],
    routines: [mockRoutine],
    dailyCheckIns: [],
    habitDeferrals: [],
    routineRuns: [],
    weeklyPlans: [],
    departurePlans: [],
    personalExperiments: [],
    settings,
    entitlement: defaultEntitlement
  };
}

let latest: ReturnType<typeof useSpark>;

function Consumer() {
  latest = useSpark();
  return <Text>{latest.loading ? 'Loading' : 'Ready'}</Text>;
}

async function renderProvider() {
  const view = await render(
    <SparkProvider>
      <Consumer />
    </SparkProvider>
  );
  await view.findByText('Ready');
  return view;
}

describe('SparkProvider persistence and orchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-16T12:00:00.000Z'));
    mockData = initialData();
    mockNotificationResponse = undefined;
  });

  afterEach(() => jest.useRealTimers());

  it('loads local data and synchronizes reminders and all data-backed widgets', async () => {
    await renderProvider();
    expect(Database.purgeExpiredHabitDeferrals).toHaveBeenCalled();
    expect(Database.loadAppData).toHaveBeenCalled();
    await waitFor(() =>
      expect(rescheduleHabitNotifications).toHaveBeenCalledWith(
        [mockHabit],
        [],
        false,
        4,
        expect.any(String),
        false,
        'private',
        null
      )
    );
    expect(syncTodayWidget).toHaveBeenCalled();
    expect(syncFocusWidget).toHaveBeenCalledWith([]);
    expect(syncRoutineWidget).toHaveBeenCalledWith([mockRoutine], []);
    expect(latest.habits[0]?.id).toBe('habit');
  });

  it('persists a completion, clears its current deferral, updates tags, and undoes it', async () => {
    mockData = {
      ...initialData(),
      habitDeferrals: [
        {
          habitId: 'habit',
          until: '2026-07-16T18:00:00.000Z',
          kind: 'later_today'
        }
      ]
    };
    await renderProvider();
    let completion!: Completion;
    await act(async () => {
      completion = await latest.completeHabit(
        mockHabit,
        mockHabit.variants[0]!,
        'today',
        { context: 'home', tags: ['made_it_tiny'] }
      );
    });
    expect(Database.insertCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        habitId: 'habit',
        localDate: '2026-07-16',
        context: 'home',
        tags: ['made_it_tiny']
      })
    );
    expect(Database.deleteHabitDeferral).toHaveBeenCalledWith('habit');
    expect(latest.completions[0]?.id).toBe(completion.id);
    expect(latest.habitDeferrals).toEqual([]);

    await act(async () => {
      await latest.setCompletionTags(completion.id, ['timer_helped']);
    });
    expect(Database.updateCompletionTags).toHaveBeenCalledWith(completion.id, [
      'timer_helped'
    ]);
    expect(latest.completions[0]?.tags).toEqual(['timer_helped']);

    await act(async () => {
      await latest.undoCompletion(completion.id);
    });
    expect(Database.deleteCompletion).toHaveBeenCalledWith(completion.id);
    expect(latest.completions).toEqual([]);
  });

  it('persists capture, focus, routine position, plans, settings, and entitlement state', async () => {
    await renderProvider();
    await act(async () => {
      await latest.addCapture('  Park this thought  ');
    });
    const capture = latest.captureItems[0]!;
    expect(capture.text).toBe('Park this thought');
    await act(async () => {
      await latest.updateCapture(capture, '  Updated  ');
      await latest.resolveCapture({ ...capture, text: 'Updated' });
    });
    expect(Database.insertCaptureItem).toHaveBeenCalledTimes(3);
    await act(async () => {
      await latest.deleteCapture(capture);
    });
    expect(latest.captureItems).toEqual([]);

    const focus: FocusSession = {
      id: 'focus',
      title: 'Open document',
      plannedSeconds: 120,
      startedAt: '2026-07-16T12:00:00.000Z',
      endedAt: null,
      pausedAt: null,
      pausedSeconds: 0,
      completed: false,
      interruptionCount: 0
    };
    await act(async () => {
      await latest.saveFocus(focus);
      await latest.saveRoutinePosition({
        routineId: 'routine',
        stepIndex: 0,
        tiny: true,
        paused: false,
        skippedStepIds: [],
        startedAt: focus.startedAt,
        updatedAt: focus.startedAt
      });
    });
    expect(latest.focusSessions[0]?.id).toBe('focus');
    expect(latest.routineRuns[0]?.tiny).toBe(true);
    await act(async () => {
      await latest.clearRoutinePosition('routine');
    });
    expect(latest.routineRuns).toEqual([]);

    const week: WeeklyPlan = {
      id: 'week',
      weekStart: '2026-07-13',
      selectedHabitIds: ['habit'],
      reflection: '',
      tomorrowContext: null,
      tomorrowTinyHabitId: null,
      createdAt: '2026-07-16T12:00:00.000Z'
    };
    const departure = {
      id: 'departure',
      title: 'Leave',
      targetAt: '2026-07-16T14:00:00.000Z',
      bufferMinutes: 10,
      routineId: null,
      status: 'planned' as const,
      createdAt: '2026-07-16T12:00:00.000Z',
      completedAt: null
    };
    const experiment = {
      id: 'experiment',
      kind: 'tiny_week' as const,
      habitId: 'habit',
      startedAt: '2026-07-16T12:00:00.000Z',
      endsAt: '2026-07-23T12:00:00.000Z',
      status: 'active' as const,
      baselineStart: '2026-07-09',
      baselineEnd: '2026-07-15',
      note: ''
    };
    await act(async () => {
      await latest.saveWeeklyPlan(week);
      await latest.saveDeparturePlan(departure);
      await latest.savePersonalExperiment(experiment);
      await latest.updateSetting('simpleMode', true);
      await latest.updateEntitlement({
        premium: true,
        source: 'admin',
        expiresAt: null,
        checkedAt: '2026-07-16T12:00:00.000Z'
      });
    });
    expect(latest.weeklyPlans[0]).toEqual(week);
    expect(latest.departurePlans[0]).toEqual(departure);
    expect(latest.personalExperiments[0]).toEqual(experiment);
    expect(latest.settings.simpleMode).toBe(true);
    expect(latest.entitlement.premium).toBe(true);
  });

  it('persists check-ins, all neutral deferral windows, and notification actions', async () => {
    mockData = initialData({
      ...defaultSettings,
      rememberContextByTime: true,
      notificationsEnabled: true
    });
    await renderProvider();
    await act(async () => {
      await latest.setCheckIn('steady', 10, 'work');
    });
    expect(Database.saveCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({
        localDate: '2026-07-16',
        availableMinutes: 10,
        context: 'work'
      })
    );
    expect(Database.saveSetting).toHaveBeenCalledWith(
      'contextByPeriod',
      expect.objectContaining({ afternoon: 'work' })
    );

    for (const kind of ['not_now', 'later_today', 'tomorrow'] as const) {
      await act(async () => {
        await latest.deferHabit('habit', kind);
      });
      expect(latest.habitDeferrals[0]?.kind).toBe(kind);
    }
    await act(async () => {
      await latest.clearHabitDeferral('habit');
    });
    expect(latest.habitDeferrals).toEqual([]);

    await act(async () => {
      mockNotificationResponse?.({
        actionIdentifier: 'spark-snooze',
        notification: {
          request: { content: { data: { habitId: 'habit' } } }
        }
      });
    });
    expect(snoozeHabit).toHaveBeenCalledWith('habit', 15, 'private', false);

    await act(async () => {
      mockNotificationResponse?.({
        actionIdentifier: 'spark-quiet-today',
        notification: {
          request: { content: { data: { habitId: 'habit' } } }
        }
      });
    });
    await waitFor(() =>
      expect(Database.saveHabitDeferral).toHaveBeenCalledWith(
        expect.objectContaining({ habitId: 'habit', kind: 'quiet_today' })
      )
    );
  });

  it('writes one due automatic encrypted backup and stores its completion time', async () => {
    mockData = initialData({
      ...defaultSettings,
      automaticBackupEnabled: true,
      automaticBackupDirectoryUri: 'content://backup',
      lastAutomaticBackupAt: null
    });
    await renderProvider();
    await waitFor(() =>
      expect(writeAutomaticEncryptedBackup).toHaveBeenCalledWith(
        'content://backup'
      )
    );
    expect(Database.saveSetting).toHaveBeenCalledWith(
      'lastAutomaticBackupAt',
      '2026-07-16T12:00:00.000Z'
    );
    expect(latest.settings.lastAutomaticBackupAt).toBe(
      '2026-07-16T12:00:00.000Z'
    );
  });
});
