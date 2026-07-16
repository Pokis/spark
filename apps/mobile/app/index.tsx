import { Redirect } from 'expo-router';
import { LoadingState } from '../src/components/LoadingState';
import { useSpark } from '../src/state/SparkProvider';

export default function Index() {
  const { loading, error, settings } = useSpark();
  if (loading || error) return <LoadingState error={error} />;
  return <Redirect href={settings.onboardingComplete ? '/(tabs)' : '/onboarding'} />;
}
