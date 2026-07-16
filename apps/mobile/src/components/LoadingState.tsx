import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { Body, Muted } from './Typography';

export function LoadingState({ error }: { error?: string | null }) {
  const theme = useTheme();
  return (
    <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
      {error ? (
        <>
          <Body>Spark could not open its local data.</Body>
          <Muted>{error}</Muted>
        </>
      ) : (
        <>
          <ActivityIndicator color={theme.primary} size="large" />
          <Muted>Gathering your Sparks…</Muted>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14
  }
});
