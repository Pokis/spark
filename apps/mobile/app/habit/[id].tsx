import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { HabitEditor } from '../../src/components/HabitEditor';
import { Screen } from '../../src/components/Screen';
import { H1, Muted } from '../../src/components/Typography';
import { useSpark } from '../../src/state/SparkProvider';

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const spark = useSpark();
  const habit = spark.habits.find((candidate) => candidate.id === id);
  if (!habit) {
    return (
      <Screen>
        <H1>Habit not found</H1>
        <Muted>It may have been removed while this screen was open.</Muted>
        <Button label="Go back" onPress={() => router.back()} />
      </Screen>
    );
  }
  return (
    <HabitEditor
      habit={habit}
      onSaved={() => router.back()}
      onArchive={() => void spark.archiveHabit(habit).then(() => router.back())}
      onHistory={() => router.push(`/habit/${habit.id}/history`)}
    />
  );
}
