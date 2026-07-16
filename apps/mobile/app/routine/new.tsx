import { router, useLocalSearchParams } from 'expo-router';
import { RoutineEditor } from '../../src/components/RoutineEditor';

export default function NewRoutineScreen() {
  const { step } = useLocalSearchParams<{ step?: string }>();
  return <RoutineEditor initialStep={step} onSaved={() => router.back()} />;
}
