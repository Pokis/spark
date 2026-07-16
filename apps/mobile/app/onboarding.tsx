import Ionicons from '@expo/vector-icons/Ionicons';
import type { Habit } from '@spark/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/Chip';
import { FormField } from '../src/components/FormField';
import { Screen } from '../src/components/Screen';
import { Body, Eyebrow, H1, Muted } from '../src/components/Typography';
import { useSpark } from '../src/state/SparkProvider';
import { palette, useTheme } from '../src/theme';
import { createId } from '../src/lib/id';

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
  },
  {
    eyebrow: 'One personal Spark',
    title: 'Make the first step yours.',
    body: 'Name one thing you want to make easier. Spark will create gentle starting sizes you can edit later.',
    icon: 'create-outline' as const
  }
];

export default function OnboardingScreen() {
  const [page, setPage] = useState(0);
  const [firstHabit, setFirstHabit] = useState('');
  const spark = useSpark();
  const theme = useTheme();
  const current = pages[page]!;

  async function finish(createPersonalHabit: boolean) {
    if (createPersonalHabit && firstHabit.trim()) {
      const habitId = createId('habit');
      const title = firstHabit.trim();
      const now = new Date();
      const habit: Habit = {
        id: habitId,
        title,
        reason: 'A personal first Spark chosen during onboarding.',
        color: palette.coral,
        icon: '✨',
        variants: [
          {
            id: createId('variant'),
            kind: 'tiny',
            label: `Touch the first step for ${title}`,
            targetMinutes: 1,
            reward: 1
          },
          {
            id: createId('variant'),
            kind: 'standard',
            label: title,
            targetMinutes: 5,
            reward: 2
          },
          {
            id: createId('variant'),
            kind: 'stretch',
            label: `Spend 15 minutes on ${title}`,
            targetMinutes: 15,
            reward: 3
          }
        ],
        schedule: { type: 'anytime' },
        reminderEnabled: false,
        priority: 2,
        contexts: ['anywhere'],
        createdAt: now.toISOString(),
        pausedAt: null,
        pausedUntil: null,
        pauseHistory: [],
        archivedAt: null,
        sortOrder: spark.habits.length
      };
      await spark.saveHabit(habit);
      await spark.setCheckIn('steady', null);
    }
    await spark.updateSetting('onboardingComplete', true);
    router.replace('/(tabs)');
  }

  async function continueFlow() {
    if (page < pages.length - 1) {
      setPage((value) => value + 1);
      return;
    }
    await finish(Boolean(firstHabit.trim()));
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
        {page === pages.length - 1 ? (
          <>
            <View style={styles.templateRow}>
              {['Read something', 'Move my body', 'Reset my space'].map((value) => (
                <Chip
                  key={value}
                  label={value}
                  selected={firstHabit === value}
                  onPress={() => setFirstHabit(value)}
                />
              ))}
            </View>
            <FormField
              label="My first personal Spark"
              placeholder="e.g. Open the document"
              value={firstHabit}
              onChangeText={setFirstHabit}
              maxLength={80}
              testID="onboarding-first-habit"
            />
          </>
        ) : null}
      </Card>
      <View style={styles.actions}>
        <Button
          label={
            page === pages.length - 1 && firstHabit.trim()
              ? 'Create my first Spark'
              : page === pages.length - 1
                ? 'Use gentle starters'
                : 'Continue'
          }
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
  actions: { gap: 10 },
  templateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
});
