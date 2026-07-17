import { useLocalSearchParams } from 'expo-router';
import { HabitEditor } from '../../src/components/HabitEditor';
import { goBackOr } from '../../src/lib/navigation';

export default function NewHabitScreen() {
  const { title } = useLocalSearchParams<{ title?: string }>();
  return <HabitEditor initialTitle={title} onSaved={() => goBackOr('/(tabs)/journey')} />;
}
