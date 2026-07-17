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
    title: 'One doable action at a time.',
    body: 'Spark is a habit and focus tracker that helps you choose a clear next action, record each win, and learn what helps you start.',
    icon: 'sparkles-outline' as const
  },
  {
    eyebrow: 'Plain language',
    title: 'A habit is something you want to repeat.',
    body: 'Each habit has three action sizes: tiny, standard, and stretch. All three count as a win. Spark suggests a size; you choose what actually fits.',
    icon: 'options-outline' as const
  },
  {
    eyebrow: 'Predictable progress',
    title: 'A completed action becomes a win.',
    body: 'A tiny action earns 1 Spark point, standard earns 2, and stretch earns 3. These fixed point values build a clear progress record and can be hidden in Settings.',
    icon: 'checkmark-circle-outline' as const
  },
  {
    eyebrow: 'Private by default',
    title: 'Your real life stays on this device.',
    body: 'Habits, focus sessions, and brain dumps live in encrypted local storage. Cloud support is optional and never receives that data.',
    icon: 'shield-checkmark-outline' as const
  },
  {
    eyebrow: 'Your first habit',
    title: 'What would you like to move forward?',
    body: 'Spark already includes two editable examples: Drink some water and Reset one surface. Add your own habit now, or continue with those examples.',
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
        reason: 'A personal first habit chosen during onboarding.',
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
    <Screen contentStyle={styles.screen} testID="onboarding-screen">
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
        <Muted>Step {page + 1} of {pages.length}</Muted>
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
            <Text style={styles.promiseIcon}>✓</Text>
            <Muted>Every completed action builds your progress. Tiny, standard, and stretch wins all count.</Muted>
          </View>
        ) : null}
        {page === 1 ? (
          <View style={[styles.definition, { backgroundColor: theme.surfaceAlt }]}>
            <Muted><Text style={styles.definitionLabel}>Habit</Text> = what you want to repeat</Muted>
            <Muted><Text style={styles.definitionLabel}>Action</Text> = one size you can do today</Muted>
            <Muted><Text style={styles.definitionLabel}>Win</Text> = an action you chose to log</Muted>
          </View>
        ) : null}
        {page === 2 ? (
          <View style={styles.rewardRow}>
            {['Tiny = 1 point', 'Standard = 2', 'Stretch = 3'].map((label) => (
              <View
                key={label}
                style={[styles.rewardBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
              >
                <Text style={[styles.rewardBadgeText, { color: theme.text }]}>{label}</Text>
              </View>
            ))}
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
              label="My first habit"
              hint="You can edit this habit and its action sizes at any time."
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
              ? 'Create my first habit'
              : page === pages.length - 1
                ? 'Continue with 2 examples'
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
  screen: { justifyContent: 'space-between', paddingBottom: 26, minHeight: '100%' },
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
  definition: { borderRadius: 14, padding: 13, gap: 7 },
  definitionLabel: { fontWeight: '800' },
  rewardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rewardBadge: { minHeight: 40, borderWidth: 1, borderRadius: 99, paddingHorizontal: 12, justifyContent: 'center' },
  rewardBadgeText: { fontSize: 13, fontWeight: '700' },
  actions: { gap: 10 },
  templateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
});
