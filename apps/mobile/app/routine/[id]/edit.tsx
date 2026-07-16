import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../../src/components/Button';
import { RoutineEditor } from '../../../src/components/RoutineEditor';
import { Screen } from '../../../src/components/Screen';
import { H1 } from '../../../src/components/Typography';
import { useSpark } from '../../../src/state/SparkProvider';

export default function EditRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const spark = useSpark();
  const routine = spark.routines.find((candidate) => candidate.id === id);
  if (!routine) {
    return (
      <Screen>
        <H1>Routine not found</H1>
        <Button label="Go back" onPress={() => router.back()} />
      </Screen>
    );
  }
  return <RoutineEditor routine={routine} onSaved={() => router.back()} />;
}
