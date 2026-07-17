import { useLocalSearchParams } from 'expo-router';
import { RoutineEditor } from '../../src/components/RoutineEditor';
import { goBackOr } from '../../src/lib/navigation';

export default function NewRoutineScreen() {
  const { step } = useLocalSearchParams<{ step?: string }>();
  return <RoutineEditor initialStep={step} onSaved={() => goBackOr('/(tabs)/journey')} />;
}
