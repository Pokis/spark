import { StyleSheet, View } from 'react-native';
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
          <View accessibilityRole="progressbar" accessibilityLabel="Loading Spark" style={styles.skeletons}>
            <View style={[styles.skeletonTitle, { backgroundColor: theme.surfaceAlt }]} />
            <View style={[styles.skeletonCard, { backgroundColor: theme.surfaceAlt }]} />
            <View style={[styles.skeletonCard, { backgroundColor: theme.surfaceAlt }]} />
          </View>
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
  },
  skeletons: { width: '100%', maxWidth: 420, gap: 12 },
  skeletonTitle: { width: '62%', height: 26, borderRadius: 8 },
  skeletonCard: { width: '100%', height: 82, borderRadius: 18 }
});
