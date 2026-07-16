import { Redirect, useLocalSearchParams } from 'expo-router';

export default function FocusLaunchShortcut() {
  const { minutes } = useLocalSearchParams<{ minutes?: string }>();
  return (
    <Redirect
      href={{
        pathname: '/(tabs)/focus',
        params: { minutes: minutes ?? '2' }
      }}
    />
  );
}

