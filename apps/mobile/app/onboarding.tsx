import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { Body, Eyebrow, H1, Muted } from '../src/components/Typography';
import { useSpark } from '../src/state/SparkProvider';
import { palette, useTheme } from '../src/theme';

const pages = [
  {
    eyebrow: 'Welcome to Spark',
    title: 'Progress without the shame spiral.',
    body: 'Tiny counts. Coming back counts. A hard day changes the plan—not your worth.',
    icon: 'sparkles-outline' as const
  },
  {
    eyebrow: 'Flexible consistency',
    title: 'Choose the size that fits today.',
    body: 'Every habit has a tiny, standard, and stretch version. Spark recommends one, but you stay in charge.',
    icon: 'options-outline' as const
  },
  {
    eyebrow: 'Private by default',
    title: 'Your real life stays on this device.',
    body: 'Habits, focus sessions, and brain dumps live in encrypted local storage. Cloud support is optional and never receives that data.',
    icon: 'shield-checkmark-outline' as const
  }
];

export default function OnboardingScreen() {
  const [page, setPage] = useState(0);
  const { updateSetting } = useSpark();
  const theme = useTheme();
  const current = pages[page]!;

  async function continueFlow() {
    if (page < pages.length - 1) {
      setPage((value) => value + 1);
      return;
    }
    await updateSetting('onboardingComplete', true);
    router.replace('/(tabs)');
  }

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <View style={styles.top}>
        <Image
          source={require('../assets/spark-icon-v2.png')}
          accessibilityIgnoresInvertColors
          style={styles.logo}
        />
        <View style={styles.dots}>
          {pages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index === page ? theme.primary : theme.border }
              ]}
            />
          ))}
        </View>
      </View>
      <Card style={styles.hero}>
        <View style={[styles.icon, { backgroundColor: `${palette.coral}22` }]}>
          <Ionicons name={current.icon} size={36} color={theme.primary} />
        </View>
        <Eyebrow>{current.eyebrow}</Eyebrow>
        <H1>{current.title}</H1>
        <Body>{current.body}</Body>
        {page === 0 ? (
          <View style={[styles.promise, { backgroundColor: theme.surfaceAlt }]}>
            <Text style={styles.promiseIcon}>↻</Text>
            <Muted>No streak resets. No red failure calendars. No random reward gambling.</Muted>
          </View>
        ) : null}
      </Card>
      <View style={styles.actions}>
        <Button
          label={page === pages.length - 1 ? 'Start gently' : 'Continue'}
          onPress={() => void continueFlow()}
          testID="onboarding-continue"
        />
        {page > 0 ? (
          <Button label="Back" variant="ghost" onPress={() => setPage((value) => value - 1)} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between', paddingBottom: 26 },
  top: { alignItems: 'center', gap: 18 },
  logo: { width: 72, height: 72, borderRadius: 22 },
  dots: { flexDirection: 'row', gap: 7 },
  dot: { height: 7, width: 24, borderRadius: 99 },
  hero: { padding: 22, gap: 14 },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  promise: {
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  promiseIcon: { color: palette.coral, fontSize: 24, fontWeight: '800' },
  actions: { gap: 10 }
});
