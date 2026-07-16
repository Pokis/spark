import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { LoadingState } from '../src/components/LoadingState';
import { useSpark } from '../src/state/SparkProvider';

export default function WidgetActionScreen() {
  const { habitId } = useLocalSearchParams<{ habitId?: string }>();
  const spark = useSpark();
  const handled = useRef(false);

  useEffect(() => {
    if (spark.loading || handled.current) return;
    handled.current = true;
    const habit = spark.habits.find((candidate) => candidate.id === habitId);
    const tiny = habit?.variants.find((variant) => variant.kind === 'tiny');
    if (!habit || !tiny) {
      router.replace('/(tabs)');
      return;
    }
    void spark.completeHabit(habit, tiny, 'widget').finally(() => {
      router.replace('/(tabs)');
    });
  }, [habitId, spark]);

  if (!habitId) return <Redirect href="/(tabs)" />;
  return <LoadingState />;
}
