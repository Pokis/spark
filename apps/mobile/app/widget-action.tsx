import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { LoadingState } from '../src/components/LoadingState';
import { Screen } from '../src/components/Screen';
import { Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import { useSpark } from '../src/state/SparkProvider';

export default function WidgetActionScreen() {
  const { habitId } = useLocalSearchParams<{ habitId?: string }>();
  const spark = useSpark();
  const [saving, setSaving] = useState(false);

  if (spark.loading) return <LoadingState />;
  if (!habitId) return <Redirect href="/(tabs)" />;
  const habit = spark.habits.find((candidate) => candidate.id === habitId);
  const tiny = habit?.variants.find((variant) => variant.kind === 'tiny');
  if (!habit || !tiny) return <Redirect href="/(tabs)" />;

  return (
    <Screen contentStyle={{ justifyContent: 'center' }}>
      <Card>
        <Eyebrow>Widget action</Eyebrow>
        <H1>{habit.icon} {habit.title}</H1>
        <SectionHeading>{tiny.label}</SectionHeading>
        <Muted>Nothing has been logged yet. Choose Log tiny win to create one completion.</Muted>
        <Button
          label="Log tiny win"
          loading={saving}
          onPress={() => {
            setSaving(true);
            void spark
              .completeHabit(habit, tiny, 'widget')
              .then(() => router.replace('/(tabs)'))
              .finally(() => setSaving(false));
          }}
        />
        <Button
          label="Open Today without logging"
          variant="secondary"
          onPress={() => router.replace('/(tabs)')}
        />
        <Button label="Not now" variant="ghost" onPress={() => router.back()} />
      </Card>
    </Screen>
  );
}
