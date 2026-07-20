import {
  buildTodayPlan,
  localDateKey,
  type Completion,
  type FocusSession,
  type Habit,
  type Routine
} from '@spark/domain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { SparkTodayWidget, type SparkWidgetSnapshot } from '../widgets/SparkTodayWidget';
import {
  SparkFocusWidget,
  type SparkFocusSnapshot
} from '../widgets/SparkFocusWidget';
import {
  FOCUS_WIDGET_SNAPSHOT_KEY,
  CALENDAR_WIDGET_SNAPSHOT_KEY,
  ROUTINE_WIDGET_SNAPSHOT_KEY,
  WIDGET_SNAPSHOT_KEY
} from '../widgets/widgetTaskHandler';
import {
  buildCalendarWidgetSnapshot,
  SparkCalendarWidget
} from '../widgets/SparkCalendarWidget';
import { SparkProgressWidget } from '../widgets/SparkProgressWidget';
import type { RoutineRunState } from '../data/models';
import {
  emptyRoutineSnapshot,
  SparkRoutineWidget,
  type SparkRoutineSnapshot
} from '../widgets/SparkRoutineWidget';

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
  const progressMessages = [
    'Open Progress to review completed actions.',
    'Review recent wins and milestones.',
    'Repeat a favorite action or choose another habit.'
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
        title: 'Today’s progress',
        tinyLabel: progressMessages[wordingIndex]!,
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
  const calendarSnapshot = buildCalendarWidgetSnapshot({
    habits: input.habits,
    completions: input.completions,
    today
  });
  await AsyncStorage.setItem(CALENDAR_WIDGET_SNAPSHOT_KEY, JSON.stringify(calendarSnapshot));
  await requestNativeWidgetRefresh({
    widgetName: 'SparkCalendar',
    renderWidget: () => <SparkCalendarWidget snapshot={calendarSnapshot} />
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

export async function syncRoutineWidget(
  routines: Routine[],
  routineRuns: RoutineRunState[]
): Promise<void> {
  if (Platform.OS !== 'android') return;
  const run = routineRuns[0];
  const routine =
    (run ? routines.find((item) => item.id === run.routineId && !item.archivedAt) : undefined) ??
    routines.find((item) => !item.archivedAt);
  let snapshot: SparkRoutineSnapshot = emptyRoutineSnapshot;
  if (routine) {
    const ordered = [...routine.steps].sort((a, b) => a.sortOrder - b.sortOrder);
    const stepIndex = Math.min(
      run?.routineId === routine.id ? run.stepIndex : 0,
      Math.max(0, ordered.length - 1)
    );
    snapshot = {
      routineId: routine.id,
      title: routine.title,
      icon: routine.icon,
      currentStep: ordered[stepIndex]?.title ?? 'Open this routine',
      stepNumber: ordered.length ? stepIndex + 1 : 0,
      stepCount: ordered.length,
      paused: run?.routineId === routine.id ? run.paused : false
    };
  }
  await AsyncStorage.setItem(ROUTINE_WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
  await requestNativeWidgetRefresh({
    widgetName: 'SparkRoutine',
    renderWidget: () => <SparkRoutineWidget snapshot={snapshot} />
  });
}
