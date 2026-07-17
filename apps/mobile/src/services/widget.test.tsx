import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FocusSession, Habit, Routine } from '@spark/domain';
import { Platform } from 'react-native';
import {
  requestNativeWidgetRefresh,
  syncFocusWidget,
  syncRoutineWidget,
  syncTodayWidget
} from './widget';
import {
  FOCUS_WIDGET_SNAPSHOT_KEY,
  ROUTINE_WIDGET_SNAPSHOT_KEY,
  WIDGET_SNAPSHOT_KEY
} from '../widgets/widgetTaskHandler';

jest.mock('react-native-android-widget', () => ({
  requestWidgetUpdate: jest.fn(),
  FlexWidget: 'FlexWidget',
  TextWidget: 'TextWidget'
}));

const habit: Habit = {
  id: 'habit',
  title: 'Read',
  color: '#abcdef',
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

const focus: FocusSession = {
  id: 'focus',
  title: 'Open document',
  plannedSeconds: 120,
  startedAt: '2026-07-16T10:00:00.000Z',
  endedAt: null,
  pausedAt: null,
  pausedSeconds: 0,
  completed: false,
  interruptionCount: 0
};

const routine: Routine = {
  id: 'routine',
  title: 'Leave home',
  icon: '🚪',
  color: '#8367E8',
  createdAt: '2026-07-01T00:00:00.000Z',
  steps: [
    { id: 'bag', title: 'Pack bag', estimateMinutes: 2, sortOrder: 0 },
    { id: 'shoes', title: 'Put on shoes', estimateMinutes: 1, sortOrder: 1 }
  ]
};

describe('Android widget synchronization', () => {
  const originalPlatform = Platform.OS;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-16T08:00:00.000Z'));
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android'
    });
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform
    });
  });

  it('persists one Today suggestion and requests an explicit widget refresh', async () => {
    await syncTodayWidget({
      habits: [habit],
      completions: [],
      timeZone: 'UTC',
      appIconStyle: 'calm'
    });
    const stored = JSON.parse(
      (await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY))!
    );
    expect(stored).toMatchObject({
      habitId: 'habit',
      title: 'Read',
      winsToday: 0,
      accent: '#abcdef',
      brandMark: '◌'
    });
    expect(stored).toMatchObject({ totalWins: 0, totalSparks: 0, activeHabits: 1 });
    expect(stored.tinyLabel).toContain('One line');
  });

  it('persists a progress-focused state when no habit is due', async () => {
    await syncTodayWidget({
      habits: [],
      completions: [],
      timeZone: 'UTC',
      appIconStyle: 'midnight'
    });
    expect(
      JSON.parse((await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY))!)
    ).toMatchObject({
      habitId: null,
      title: 'Today’s progress',
      brandMark: '✧'
    });
  });

  it('keeps lifetime progress in the shared local widget snapshot', async () => {
    await syncTodayWidget({
      habits: [habit],
      completions: [
        {
          id: 'completion',
          habitId: habit.id,
          variantId: 'tiny',
          variantKind: 'tiny',
          reward: 1,
          occurredAt: '2026-07-15T08:00:00.000Z',
          loggedAt: '2026-07-15T08:00:00.000Z',
          localDate: '2026-07-15',
          source: 'today'
        }
      ],
      timeZone: 'UTC'
    });
    expect(JSON.parse((await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY))!)).toMatchObject({
      totalWins: 1,
      totalSparks: 1,
      activeHabits: 1
    });
  });

  it('stores only the active Focus session and refreshes the Focus widget', async () => {
    await syncFocusWidget([
      { ...focus, id: 'ended', endedAt: '2026-07-16T09:00:00.000Z' },
      focus
    ]);
    expect(
      JSON.parse((await AsyncStorage.getItem(FOCUS_WIDGET_SNAPSHOT_KEY))!)
        .session.id
    ).toBe('focus');
  });

  it('persists the current routine step and its paused state', async () => {
    await syncRoutineWidget([routine], [
      {
        routineId: routine.id,
        stepIndex: 1,
        tiny: false,
        paused: true,
        skippedStepIds: [],
        startedAt: '2026-07-16T07:55:00.000Z',
        updatedAt: '2026-07-16T08:00:00.000Z'
      }
    ]);
    expect(
      JSON.parse((await AsyncStorage.getItem(ROUTINE_WIDGET_SNAPSHOT_KEY))!)
    ).toMatchObject({
      routineId: 'routine',
      title: 'Leave home',
      currentStep: 'Put on shoes',
      stepNumber: 2,
      stepCount: 2,
      paused: true
    });
  });

  it('stores a calm routine creation prompt when there are no routines', async () => {
    await syncRoutineWidget([], []);
    expect(
      JSON.parse((await AsyncStorage.getItem(ROUTINE_WIDGET_SNAPSHOT_KEY))!)
    ).toMatchObject({
      routineId: null,
      title: 'Create a routine',
      stepNumber: 0
    });
  });

  it('does nothing on iOS because these widgets are Android-specific', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    await syncTodayWidget({ habits: [habit], completions: [], timeZone: 'UTC' });
    await syncFocusWidget([focus]);
    await syncRoutineWidget([routine], []);
    expect(await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(FOCUS_WIDGET_SNAPSHOT_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(ROUTINE_WIDGET_SNAPSHOT_KEY)).toBeNull();
  });

  it('calls the native widget module when present and fails softly in Expo Go', async () => {
    const requestWidgetUpdate = jest.fn();
    await expect(
      requestNativeWidgetRefresh(
        {
          widgetName: 'SparkFocus',
          renderWidget: () => null as never
        },
        async () => ({ requestWidgetUpdate }) as never
      )
    ).resolves.toBe(true);
    expect(requestWidgetUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ widgetName: 'SparkFocus' })
    );
    await expect(
      requestNativeWidgetRefresh(
        {
          widgetName: 'SparkFocus',
          renderWidget: () => null as never
        },
        async () => {
          throw new Error('native module missing');
        }
      )
    ).resolves.toBe(false);
  });
});
