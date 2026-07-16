import { router, useLocalSearchParams } from 'expo-router';
import { HabitEditor } from '../../src/components/HabitEditor';

export default function NewHabitScreen() {
  const { title } = useLocalSearchParams<{ title?: string }>();
  return <HabitEditor initialTitle={title} onSaved={() => router.back()} />;
}
