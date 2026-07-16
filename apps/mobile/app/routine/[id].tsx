import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { Eyebrow, H1, Muted, SectionHeading } from '../../src/components/Typography';
import { useSpark } from '../../src/state/SparkProvider';
import { useTheme } from '../../src/theme';

export default function RoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const spark = useSpark();
  const theme = useTheme();
  const routine = spark.routines.find((candidate) => candidate.id === id);
  const [stepIndex, setStepIndex] = useState(0);
  const [tiny, setTiny] = useState(false);
  const [finished, setFinished] = useState(false);
  const ordered = useMemo(
    () => [...(routine?.steps ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [routine?.steps]
  );
  const step = ordered[stepIndex];

  if (!routine) {
    return (
      <Screen>
        <H1>Routine not found</H1>
        <Button label="Go back" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function next() {
    if (spark.settings.hapticsEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (stepIndex >= ordered.length - 1) {
      setFinished(true);
    } else {
      setStepIndex((value) => value + 1);
      setTiny(false);
    }
  }

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <View>
        <Eyebrow>{routine.icon} {routine.title}</Eyebrow>
        <H1>{finished ? 'Routine complete.' : `Step ${stepIndex + 1} of ${ordered.length}`}</H1>
      </View>
      {finished ? (
        <Card style={styles.center}>
          <Text style={styles.finishIcon}>✦</Text>
          <SectionHeading>You carried yourself through.</SectionHeading>
          <Muted>No speed score. No perfect execution. The transition happened.</Muted>
        </Card>
      ) : step ? (
        <Card style={[styles.stepCard, { borderColor: routine.color }]}>
          <View style={[styles.stepNumber, { backgroundColor: `${routine.color}22` }]}>
            <Text style={[styles.stepNumberText, { color: routine.color }]}>{stepIndex + 1}</Text>
          </View>
          <H1>{tiny && step.tinyTitle ? step.tinyTitle : step.title}</H1>
          <Muted>About {tiny ? 1 : step.estimateMinutes} minute{step.estimateMinutes === 1 ? '' : 's'}</Muted>
          {step.tinyTitle ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setTiny((value) => !value)}
              style={[styles.tiny, { backgroundColor: theme.surfaceAlt }]}
            >
              <Ionicons name="resize-outline" size={19} color={theme.primary} />
              <Text style={[styles.tinyText, { color: theme.text }]}>
                {tiny ? 'Show regular step' : 'Make this step tiny'}
              </Text>
            </Pressable>
          ) : null}
        </Card>
      ) : null}
      <View style={styles.actions}>
        {finished ? (
          <Button label="Back to journey" onPress={() => router.back()} />
        ) : (
          <>
            <Button label={stepIndex === ordered.length - 1 ? 'Finish' : 'Step done'} onPress={() => void next()} />
            {stepIndex > 0 ? (
              <Button
                label="Previous step"
                variant="ghost"
                onPress={() => setStepIndex((value) => value - 1)}
              />
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between', paddingBottom: 28 },
  stepCard: { padding: 24, alignItems: 'center', gap: 14 },
  stepNumber: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepNumberText: { fontSize: 24, fontWeight: '800' },
  tiny: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  tinyText: { fontSize: 14, fontWeight: '700' },
  center: { alignItems: 'center', padding: 28 },
  finishIcon: { color: '#FFC857', fontSize: 68 },
  actions: { gap: 9 }
});
