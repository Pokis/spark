import {
  addCalendarDays,
  momentumForHabit,
  momentumMilestone,
  type Habit,
  type MomentumCompletion,
  type MomentumProtectionKind
} from '@spark/domain';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { loadHabitCompletionDates } from '../data/database';
import { reportError } from '../services/diagnostics';
import { useSpark } from '../state/SparkProvider';
import { useTheme } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import { Body, Eyebrow, Muted, SectionHeading } from './Typography';

function friendlyDate(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

export function MomentumCard({ habit }: { habit: Habit }) {
  const spark = useSpark();
  const theme = useTheme();
  const [history, setHistory] = useState<MomentumCompletion[]>(() =>
    spark.completions.filter((completion) => completion.habitId === habit.id)
  );
  const [savingKind, setSavingKind] = useState<MomentumProtectionKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadHabitCompletionDates(habit.id)
      .then((completions) => {
        if (active) setHistory(completions);
      })
      .catch((reason) => void reportError('momentum.load_history', reason));
    return () => {
      active = false;
    };
  }, [habit.id, spark.completions]);

  const summary = useMemo(
    () => momentumForHabit(habit, history, new Date(), spark.timeZone),
    [habit, history, spark.timeZone]
  );
  if (!habit.momentum?.enabled || !summary) return null;

  const windowEnd = addCalendarDays(summary.activeWindowStart, summary.cadenceDays - 1);
  const milestone = momentumMilestone(summary.current);
  const cadenceLabel = summary.cadence === 'daily' ? 'Daily streak' : 'Every-other-day streak';
  const statusText =
    summary.status === 'on-track'
      ? `You completed this period. The next chance starts ${friendlyDate(summary.nextWindowStart)}.`
      : summary.status === 'resting'
        ? `Protected period. Your next streak window starts ${friendlyDate(summary.nextWindowStart)}.`
        : summary.status === 'not-started'
          ? `Your streak can begin ${friendlyDate(summary.nextWindowStart)}.`
          : summary.current > 0
            ? `Complete any version by ${friendlyDate(windowEnd)} to continue the streak.`
            : summary.best > 0
              ? `Start a new streak in this period and build toward your personal best of ${summary.best}.`
              : `Complete any version by ${friendlyDate(windowEnd)} to begin a streak.`;

  async function protect(windowStart: string, kind: MomentumProtectionKind) {
    if (!habit.momentum) return;
    setSavingKind(kind);
    setError(null);
    try {
      const protections = [
        ...habit.momentum.protections.filter(
          (protection) => protection.windowStart !== windowStart
        ),
        { windowStart, kind }
      ].sort((a, b) => a.windowStart.localeCompare(b.windowStart));
      await spark.saveHabit({
        ...habit,
        momentum: { ...habit.momentum, protections }
      });
    } catch (reason) {
      setError('Spark could not save that streak protection. Your existing streak is unchanged.');
      await reportError(`momentum.${kind}`, reason);
    } finally {
      setSavingKind(null);
    }
  }

  return (
    <Card style={{ borderColor: habit.color }}>
      <View style={styles.headingRow}>
        <View style={[styles.icon, { backgroundColor: `${habit.color}22` }]}>
          <Text style={styles.emoji}>{habit.icon}</Text>
        </View>
        <View style={styles.headingText}>
          <Eyebrow>{cadenceLabel}</Eyebrow>
          <SectionHeading>{habit.title}</SectionHeading>
        </View>
      </View>

      <View
        accessible
        accessibilityLabel={`Current streak ${summary.current}; personal best ${summary.best}`}
        style={styles.scoreRow}
      >
        <Text style={[styles.current, { color: habit.color }]}>{summary.current}</Text>
        <View style={styles.scoreCopy}>
          <Body>{summary.current === 1 ? 'period in the current streak' : 'periods in the current streak'}</Body>
          <Muted>Personal best {summary.best} · {summary.completedWindows} completed periods total</Muted>
        </View>
      </View>

      {milestone ? (
        <View style={[styles.milestone, { backgroundColor: theme.surfaceAlt }]}>
          <Text style={styles.milestoneIcon}>✦</Text>
          <Body>{milestone} earned</Body>
        </View>
      ) : null}
      <Body>{statusText}</Body>

      <View style={[styles.flexRow, { borderColor: theme.border }]}>
        <View style={styles.flexCount}>
          <Text style={[styles.flexNumber, { color: theme.primary }]}>
            {summary.flexPassesAvailable}
          </Text>
          <Muted>streak {summary.flexPassesAvailable === 1 ? 'save' : 'saves'} available</Muted>
        </View>
        <Muted style={styles.flexExplanation}>
          You start with 2 and earn another after 5 completed periods, up to 3. Use one to
          preserve streak continuity for a past period; completed-action history comes from Done taps.
        </Muted>
      </View>

      {summary.mostRecentMissedWindow && summary.flexPassesAvailable > 0 ? (
        <Button
          label={`Use a streak save for ${friendlyDate(summary.mostRecentMissedWindow)}`}
          variant="secondary"
          loading={savingKind === 'flex'}
          disabled={savingKind !== null}
          accessibilityHint="Preserves streak continuity for that period"
          onPress={() =>
            void protect(summary.mostRecentMissedWindow!, 'flex')
          }
        />
      ) : null}
      {summary.status === 'due' ? (
        <Button
          label="Take a planned break for this period"
          variant="ghost"
          loading={savingKind === 'delay'}
          disabled={savingKind !== null}
          accessibilityHint="Marks this streak period as a planned break"
          onPress={() => void protect(summary.activeWindowStart, 'delay')}
        />
      ) : null}
      {error ? <Muted accessibilityLiveRegion="assertive">{error}</Muted> : null}
      <Button
        label="Edit streak settings"
        variant="ghost"
        disabled={savingKind !== null}
        onPress={() => router.push(`/habit/${habit.id}`)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emoji: { fontSize: 23 },
  headingText: { flex: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  current: { fontSize: 48, lineHeight: 54, fontWeight: '900' },
  scoreCopy: { flex: 1 },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 7
  },
  milestoneIcon: { color: '#E2A72E', fontSize: 19 },
  flexRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1
  },
  flexCount: { minWidth: 88, alignItems: 'center' },
  flexNumber: { fontSize: 28, lineHeight: 32, fontWeight: '900' },
  flexExplanation: { flex: 1, minWidth: 190 }
});
