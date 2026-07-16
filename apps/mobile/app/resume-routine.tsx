import { Redirect } from 'expo-router';
import { LoadingState } from '../src/components/LoadingState';
import { useSpark } from '../src/state/SparkProvider';

export default function ResumeRoutineShortcut() {
  const spark = useSpark();
  if (spark.loading) return <LoadingState />;
  const run = spark.routineRuns[0];
  return <Redirect href={run ? `/routine/${run.routineId}` : '/(tabs)/journey'} />;
}

