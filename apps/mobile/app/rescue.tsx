import { Redirect } from 'expo-router';
import { useEffect, useRef } from 'react';
import { LoadingState } from '../src/components/LoadingState';
import { useSpark } from '../src/state/SparkProvider';

export default function RescueShortcut() {
  const spark = useSpark();
  const handled = useRef(false);
  useEffect(() => {
    if (spark.loading || handled.current) return;
    handled.current = true;
    void spark.updateSetting('minimumViableDay', true);
  }, [spark]);
  if (spark.loading || !handled.current) return <LoadingState />;
  return <Redirect href="/(tabs)" />;
}

