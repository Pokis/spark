import { buildTodayPlan, localDateKey, type Completion, type Habit } from '@spark/domain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { SparkTodayWidget, type SparkWidgetSnapshot } from '../widgets/SparkTodayWidget';
import { WIDGET_SNAPSHOT_KEY } from '../widgets/widgetTaskHandler';

export async function syncTodayWidget(input: {
  habits: Habit[];
  completions: Completion[];
  timeZone: string;
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
  const snapshot: SparkWidgetSnapshot = suggestion
    ? {
        habitId: suggestion.habit.id,
        title: suggestion.habit.title,
        tinyLabel:
          suggestion.habit.variants.find((variant) => variant.kind === 'tiny')?.label ??
          suggestion.variant.label,
        winsToday,
        accent: suggestion.habit.color
      }
    : {
        habitId: null,
        title: 'Enough for today',
        tinyLabel: 'Rest is allowed. Tap to see your Journey.',
        winsToday,
        accent: '#20B8B2'
      };
  await AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
  try {
    const { requestWidgetUpdate } = await import('react-native-android-widget');
    requestWidgetUpdate({
      widgetName: 'SparkToday',
      renderWidget: () => <SparkTodayWidget snapshot={snapshot} />
    });
  } catch {
    // Expo Go does not include the native widget module. The app remains fully usable.
  }
}
