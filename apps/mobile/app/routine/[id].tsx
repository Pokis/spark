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
import { goBackOr } from '../../src/lib/navigation';

export default function RoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const spark = useSpark();
  const theme = useTheme();
  const routine = spark.routines.find((candidate) => candidate.id === id);
  const saved = spark.routineRuns.find((candidate) => candidate.routineId === id);
  const [stepIndex, setStepIndex] = useState(
    Math.min(saved?.stepIndex ?? 0, Math.max(0, (routine?.steps.length ?? 1) - 1))
  );
  const [tiny, setTiny] = useState(saved?.tiny ?? false);
  const [paused, setPaused] = useState(saved?.paused ?? false);
  const [skippedStepIds, setSkippedStepIds] = useState<string[]>(
    saved?.skippedStepIds ?? []
  );
  const [finished, setFinished] = useState(false);
  const startedAt = saved?.startedAt ?? new Date().toISOString();
  const ordered = useMemo(
    () => [...(routine?.steps ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [routine?.steps]
  );
  const step = ordered[stepIndex];
  const remainingMinutes = ordered
    .slice(stepIndex)
    .filter((candidate) => !skippedStepIds.includes(candidate.id))
    .reduce((sum, candidate) => sum + candidate.estimateMinutes, 0);
  const finishAt = new Date(Date.now() + remainingMinutes * 60_000).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  });

  if (!routine) {
    return (
      <Screen>
        <H1>Routine not found</H1>
        <Button label="Go back" onPress={() => goBackOr('/(tabs)/journey')} />
      </Screen>
    );
  }

  async function persist(
    nextStepIndex = stepIndex,
    nextTiny = tiny,
    nextPaused = paused,
    nextSkipped = skippedStepIds
  ) {
    await spark.saveRoutinePosition({
      routineId: routine!.id,
      stepIndex: nextStepIndex,
      tiny: nextTiny,
      paused: nextPaused,
      skippedStepIds: nextSkipped,
      startedAt,
      updatedAt: new Date().toISOString()
    });
  }

  async function next() {
    if (spark.settings.hapticsEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    if (stepIndex >= ordered.length - 1) {
      setFinished(true);
      await spark.clearRoutinePosition(routine!.id);
    } else {
      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      setTiny(false);
      await persist(nextIndex, false, false);
    }
  }

  async function skip() {
    if (!step) return;
    const nextSkipped = [...new Set([...skippedStepIds, step.id])];
    setSkippedStepIds(nextSkipped);
    if (stepIndex >= ordered.length - 1) {
      setFinished(true);
      await spark.clearRoutinePosition(routine!.id);
    } else {
      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      setTiny(false);
      await persist(nextIndex, false, false, nextSkipped);
    }
  }

  async function toggleTiny() {
    const next = !tiny;
    setTiny(next);
    await persist(stepIndex, next);
  }

  async function pauseRoutine() {
    setPaused(true);
    await persist(stepIndex, tiny, true);
  }

  async function resumeRoutine() {
    setPaused(false);
    await persist(stepIndex, tiny, false);
  }

  if (paused) {
    return (
      <Screen contentStyle={styles.screen}>
        <View>
          <Eyebrow>{routine.icon} {routine.title}</Eyebrow>
          <H1>Paused without losing your place.</H1>
          <Muted>Step {stepIndex + 1} is waiting locally. There is no timer or penalty.</Muted>
        </View>
        <Card style={styles.center}>
          <Text style={styles.pauseIcon}>Ⅱ</Text>
          <SectionHeading>{step?.title ?? 'Your next step'}</SectionHeading>
          <Muted>Resume now or leave Spark. The routine will still be here.</Muted>
        </Card>
        <View style={styles.actions}>
          <Button label="Resume routine" onPress={() => void resumeRoutine()} />
          <Button label="Leave it paused" variant="ghost" onPress={() => goBackOr('/(tabs)/journey')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.top}>
        <View style={styles.titleArea}>
          <Eyebrow>{routine.icon} {routine.title}</Eyebrow>
          <H1>{finished ? 'Routine complete.' : `Step ${stepIndex + 1} of ${ordered.length}`}</H1>
          {!finished ? (
            <Muted>Gentle estimate: about {remainingMinutes} min · around {finishAt}</Muted>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${routine.title}`}
          onPress={() => router.push(`/routine/${routine.id}/edit`)}
        >
          <Ionicons name="create-outline" size={24} color={theme.primary} />
        </Pressable>
      </View>
      {finished ? (
        <Card style={styles.center}>
          <Text style={styles.finishIcon}>✦</Text>
          <SectionHeading>You carried yourself through.</SectionHeading>
          <Muted>No speed score. No perfect execution. The transition happened.</Muted>
          {skippedStepIds.length ? (
            <Muted>{skippedStepIds.length} step{skippedStepIds.length === 1 ? '' : 's'} skipped without penalty.</Muted>
          ) : null}
        </Card>
      ) : step ? (
        <Card style={[styles.stepCard, { borderColor: routine.color }]}>
          <View style={[styles.stepNumber, { backgroundColor: `${routine.color}22` }]}>
            <Text style={[styles.stepNumberText, { color: routine.color }]}>{stepIndex + 1}</Text>
          </View>
          <H1>{tiny && step.tinyTitle ? step.tinyTitle : step.title}</H1>
          <Muted>
            About {tiny ? 1 : step.estimateMinutes} minute
            {(tiny ? 1 : step.estimateMinutes) === 1 ? '' : 's'}
          </Muted>
          <View style={styles.inlineActions}>
            {step.tinyTitle ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tiny ? 'Show regular step' : 'Make this step tiny'}
                accessibilityState={{ checked: tiny }}
                onPress={() => void toggleTiny()}
                style={[styles.smallAction, { backgroundColor: theme.surfaceAlt }]}
              >
                <Ionicons name="resize-outline" size={19} color={theme.primary} />
                <Text style={[styles.smallActionText, { color: theme.text }]}>
                  {tiny ? 'Regular size' : 'Make tiny'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Start a two minute focus block for ${step.title}`}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/focus',
                  params: {
                    title: step.title,
                    minutes: String(step.focusMinutes ?? 2)
                  }
                })
              }
              style={[styles.smallAction, { backgroundColor: theme.surfaceAlt }]}
            >
              <Ionicons name="timer-outline" size={19} color={theme.primary} />
              <Text style={[styles.smallActionText, { color: theme.text }]}>
                {step.focusMinutes ?? 2}-min focus
              </Text>
            </Pressable>
            {step.linkedHabitId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open linked habit"
                onPress={() => router.push(`/habit/${step.linkedHabitId}`)}
                style={[styles.smallAction, { backgroundColor: theme.surfaceAlt }]}
              >
                <Ionicons name="repeat-outline" size={19} color={theme.primary} />
                <Text style={[styles.smallActionText, { color: theme.text }]}>Linked habit</Text>
              </Pressable>
            ) : null}
          </View>
        </Card>
      ) : null}
      <View style={styles.actions}>
        {finished ? (
          <Button label="Back to journey" onPress={() => goBackOr('/(tabs)/journey')} />
        ) : (
          <>
            <Button
              label={stepIndex === ordered.length - 1 ? 'Finish' : 'Step done'}
              onPress={() => void next()}
            />
            <View style={styles.inlineActions}>
              <Button label="Skip this step" variant="secondary" onPress={() => void skip()} />
              <Button label="Pause routine" variant="ghost" onPress={() => void pauseRoutine()} />
            </View>
            {stepIndex > 0 ? (
              <Button
                label="Previous step"
                variant="ghost"
                onPress={() => {
                  const nextIndex = stepIndex - 1;
                  setStepIndex(nextIndex);
                  setTiny(false);
                  void persist(nextIndex, false);
                }}
              />
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { minHeight: '100%', justifyContent: 'space-between', paddingBottom: 28 },
  top: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  titleArea: { flex: 1 },
  stepCard: { padding: 24, alignItems: 'center', gap: 14 },
  stepNumber: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepNumberText: { fontSize: 24, fontWeight: '800' },
  smallAction: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7
  },
  smallActionText: { fontSize: 13, fontWeight: '700' },
  inlineActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  center: { alignItems: 'center', padding: 28 },
  finishIcon: { color: '#FFC857', fontSize: 68 },
  pauseIcon: { color: '#8367E8', fontSize: 62, fontWeight: '800' },
  actions: { gap: 9 }
});
