import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FocusSession, Habit } from '@spark/domain';
import { Platform } from 'react-native';
import {
  requestNativeWidgetRefresh,
  syncFocusWidget,
  syncTodayWidget
} from './widget';
import {
  FOCUS_WIDGET_SNAPSHOT_KEY,
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
    expect(stored.tinyLabel).toContain('One line');
  });

  it('persists a calm rest state when no habit is due', async () => {
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
      title: 'Enough for today',
      brandMark: '✧'
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

  it('does nothing on iOS because these widgets are Android-specific', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    await syncTodayWidget({ habits: [habit], completions: [], timeZone: 'UTC' });
    await syncFocusWidget([focus]);
    expect(await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(FOCUS_WIDGET_SNAPSHOT_KEY)).toBeNull();
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
