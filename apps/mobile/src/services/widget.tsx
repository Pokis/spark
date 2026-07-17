import { buildTodayPlan, localDateKey, type Completion, type Habit } from '@spark/domain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { SparkTodayWidget, type SparkWidgetSnapshot } from '../widgets/SparkTodayWidget';
import {
  SparkFocusWidget,
  type SparkFocusSnapshot
} from '../widgets/SparkFocusWidget';
import {
  FOCUS_WIDGET_SNAPSHOT_KEY,
  WIDGET_SNAPSHOT_KEY
} from '../widgets/widgetTaskHandler';
import { SparkProgressWidget } from '../widgets/SparkProgressWidget';
import type { FocusSession } from '@spark/domain';

type NativeWidgetModule = Pick<
  typeof import('react-native-android-widget'),
  'requestWidgetUpdate'
>;

export async function requestNativeWidgetRefresh(
  options: Parameters<NativeWidgetModule['requestWidgetUpdate']>[0],
  load: () => Promise<NativeWidgetModule> = () =>
    import('react-native-android-widget')
): Promise<boolean> {
  try {
    const { requestWidgetUpdate } = await load();
    requestWidgetUpdate(options);
    return true;
  } catch {
    // Expo Go does not include the native widget module. The app remains fully usable.
    return false;
  }
}

export async function syncTodayWidget(input: {
  habits: Habit[];
  completions: Completion[];
  timeZone: string;
  appIconStyle?: 'classic' | 'calm' | 'midnight';
}): Promise<void> {
  if (Platform.OS !== 'android') return;
  const suggestion = buildTodayPlan({
    habits: input.habits,
    completions: input.completions,
    now: new Date(),
    timeZone: input.timeZone,
    capacity: 'steady',
    limit: 1
  })[0];
  const today = localDateKey(new Date(), input.timeZone);
  const winsToday = input.completions.filter((item) => item.localDate === today).length;
  const totalWins = input.completions.length;
  const totalSparks = input.completions.reduce((sum, item) => sum + item.reward, 0);
  const activeHabits = input.habits.filter((habit) => !habit.archivedAt).length;
  const wordingIndex = Math.abs(
    [...today].reduce((sum, character) => sum + character.charCodeAt(0), 0)
  ) % 3;
  const tinyPrefixes = ['Tiny option', 'Starting point', 'Just begin with'];
  const brandMark =
    input.appIconStyle === 'calm' ? '◌' : input.appIconStyle === 'midnight' ? '✧' : '✦';
  const restMessages = [
    'Rest is allowed. Tap to see your Journey.',
    'Nothing is overdue. Your wins are still here.',
    'Enough is a complete sentence.'
  ];
  const snapshot: SparkWidgetSnapshot = suggestion
    ? {
        habitId: suggestion.habit.id,
        title: suggestion.habit.title,
        tinyLabel: `${tinyPrefixes[wordingIndex]}: ${
          suggestion.habit.variants.find((variant) => variant.kind === 'tiny')?.label ??
          suggestion.variant.label
        }`,
        winsToday,
        totalWins,
        totalSparks,
        activeHabits,
        accent: suggestion.habit.color,
        brandMark
      }
    : {
        habitId: null,
        title: 'Enough for today',
        tinyLabel: restMessages[wordingIndex]!,
        winsToday,
        totalWins,
        totalSparks,
        activeHabits,
        accent: '#20B8B2',
        brandMark
      };
  await AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
  await requestNativeWidgetRefresh({
      widgetName: 'SparkToday',
      renderWidget: () => <SparkTodayWidget snapshot={snapshot} />
    });
  await requestNativeWidgetRefresh({
    widgetName: 'SparkProgress',
    renderWidget: () => <SparkProgressWidget snapshot={snapshot} />
  });
}

export async function syncFocusWidget(focusSessions: FocusSession[]): Promise<void> {
  if (Platform.OS !== 'android') return;
  const snapshot: SparkFocusSnapshot = {
    session: focusSessions.find((session) => !session.endedAt) ?? null,
    syncedAt: new Date().toISOString()
  };
  await AsyncStorage.setItem(FOCUS_WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
  await requestNativeWidgetRefresh({
      widgetName: 'SparkFocus',
      renderWidget: () => <SparkFocusWidget snapshot={snapshot} />
    });
}
