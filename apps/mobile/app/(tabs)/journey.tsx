import {
  localDateKey,
  recentDateKeys,
  rewardSummaryFromTotal,
  rhythmForHabit,
  supportiveInsights
} from '@spark/domain';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { Body, Eyebrow, H1, Muted, SectionHeading } from '../../src/components/Typography';
import { useSpark } from '../../src/state/SparkProvider';
import { useTheme } from '../../src/theme';

export default function JourneyScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const summary = rewardSummaryFromTotal(spark.completionTotals.totalSparks);
  const days = recentDateKeys(new Date(), spark.timeZone, 14);
  const winsByDay = days.map(
    (day) =>
      spark.completionDailySummaries.find((summary) => summary.localDate === day)?.wins ?? 0
  );
  const maxWins = Math.max(1, ...winsByDay);
  const today = localDateKey(new Date(), spark.timeZone);
  const activeHabits = spark.habits.filter((habit) => !habit.archivedAt);
  const lastSevenDays = new Set(recentDateKeys(new Date(), spark.timeZone, 7));
  const recentWins = spark.completions.filter((completion) =>
    lastSevenDays.has(completion.localDate)
  );
  const tinyWins = recentWins.filter((completion) => completion.variantKind === 'tiny').length;
  const insights = supportiveInsights({
    habits: spark.habits,
    completions: spark.completions,
    focusSessions: spark.focusSessions,
    now: new Date(),
    timeZone: spark.timeZone
  }).filter((insight) => !spark.settings.hiddenInsightIds.includes(insight.id));
  const activeRoutines = spark.routines.filter((routine) => !routine.archivedAt);
  const archivedRoutines = spark.routines.filter((routine) => routine.archivedAt);

  return (
    <Screen testID="journey-screen">
      <View>
        <Eyebrow>No-guilt progress</Eyebrow>
        <H1>Your path, not a streak.</H1>
        <Muted>Blank days are blank. They do not erase any win you already made.</Muted>
      </View>

      {spark.settings.showRewards ? (
      <Card style={[styles.levelCard, { backgroundColor: theme.surfaceAlt }]}>
        <View style={[styles.levelOrb, { backgroundColor: theme.primary }]}>
          <Text style={styles.levelNumber}>{summary.level}</Text>
        </View>
        <View style={styles.levelText}>
          <SectionHeading>Level {summary.level} Spark</SectionHeading>
          <Muted>
            {summary.totalSparks} total · {summary.nextLevelAt - summary.totalSparks} until the
            next glow
          </Muted>
          <View style={[styles.track, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progress,
                {
                  backgroundColor: theme.primary,
                  width: `${Math.max(4, Math.min(100, summary.levelProgress * 100))}%`
                }
              ]}
            />
          </View>
        </View>
      </Card>
      ) : null}

      <Card>
        <SectionHeading>Last 14 days</SectionHeading>
        <View
          accessible
          accessibilityLabel={`Fourteen day activity: ${winsByDay.reduce((a, b) => a + b, 0)} total wins`}
          style={styles.chart}
        >
          {days.map((day, index) => (
            <View key={day} style={styles.barColumn}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(5, (winsByDay[index]! / maxWins) * 76),
                    backgroundColor: day === today ? theme.primary : `${theme.purple}88`
                  }
                ]}
              />
              <Text style={[styles.dayLabel, { color: theme.textMuted }]}>
                {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: 'narrow'
                })}
              </Text>
            </View>
          ))}
        </View>
        <Muted>
          {winsByDay.filter(Boolean).length} active days ·{' '}
          {winsByDay.reduce((sum, value) => sum + value, 0)} completed actions
        </Muted>
      </Card>

      <Card style={{ borderColor: theme.purple }}>
        <Eyebrow>Gentle weekly reflection</Eyebrow>
        <SectionHeading>
          {recentWins.length
            ? `${recentWins.length} moments moved forward.`
            : 'There is room for a kind restart.'}
        </SectionHeading>
        <Body>
          {recentWins.length
            ? `${new Set(recentWins.map((completion) => completion.habitId)).size} intentions received attention. ${
                tinyWins
                  ? `${tinyWins} tiny ${tinyWins === 1 ? 'step was' : 'steps were'} enough to count.`
                  : 'Your wins took the size that worked for you.'
              }`
            : 'No missed-day score is waiting here. Choose one action small enough to begin when you are ready.'}
        </Body>
      </Card>

      {spark.settings.insightsEnabled && insights.length ? (
        <View style={styles.insights}>
          <View>
            <SectionHeading>Things Spark noticed locally</SectionHeading>
            <Muted>Observations, not grades. Nothing leaves this device.</Muted>
          </View>
          {insights.map((insight) => (
            <Card key={insight.id}>
              <View style={styles.insightHeading}>
                <View style={styles.rhythmText}>
                  <SectionHeading>{insight.title}</SectionHeading>
                  <Body>{insight.body}</Body>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Hide observation ${insight.title}`}
                  onPress={() =>
                    void spark.updateSetting('hiddenInsightIds', [
                      ...spark.settings.hiddenInsightIds,
                      insight.id
                    ])
                  }
                >
                  <Ionicons name="close" size={22} color={theme.textMuted} />
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      <View style={styles.sectionHeading}>
        <View>
          <SectionHeading>Rhythms</SectionHeading>
          <Muted>A rolling 14-day view, never a reset.</Muted>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a habit"
          onPress={() => router.push('/habit/new')}
        >
          <Ionicons name="add-circle" size={34} color={theme.primary} />
        </Pressable>
      </View>
      {activeHabits.map((habit) => {
        const rhythm = rhythmForHabit(
          habit,
          spark.completions,
          new Date(),
          spark.timeZone
        );
        return (
          <Pressable
            key={habit.id}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${habit.title}`}
            onPress={() => router.push(`/habit/${habit.id}`)}
          >
            <Card style={styles.rhythmCard}>
              <View style={[styles.habitIcon, { backgroundColor: `${habit.color}22` }]}>
                <Text style={styles.habitEmoji}>{habit.icon}</Text>
              </View>
              <View style={styles.rhythmText}>
                <Text style={[styles.rhythmTitle, { color: theme.text }]}>{habit.title}</Text>
                <Muted>
                  {rhythm.activeDays} active days · {rhythm.wins} wins
                  {rhythm.comeback ? ' · comeback!' : ''}
                </Muted>
              </View>
              {spark.settings.showRhythmPercentages ? (
                <Text style={[styles.percentage, { color: habit.color }]}>
                  {rhythm.percentage}%
                </Text>
              ) : (
                <Muted>
                  {rhythm.activeDays === 0
                    ? 'Room to begin'
                    : rhythm.comeback
                      ? 'Came back'
                      : 'Finding a rhythm'}
                </Muted>
              )}
            </Card>
          </Pressable>
        );
      })}

      <View style={styles.sectionHeading}>
        <View>
          <SectionHeading>Launch routines</SectionHeading>
          <Muted>One visible step at a time.</Muted>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a routine"
          onPress={() => router.push('/routine/new')}
        >
          <Ionicons name="add-circle" size={34} color={theme.primary} />
        </Pressable>
      </View>
      {activeRoutines.map((routine) => {
        const run = spark.routineRuns.find((item) => item.routineId === routine.id);
        return (
          <Pressable
            key={routine.id}
            accessibilityRole="button"
            accessibilityLabel={`${run ? 'Resume' : 'Start'} ${routine.title} routine`}
            onPress={() => router.push(`/routine/${routine.id}`)}
          >
            <Card style={styles.routine}>
              <Text style={styles.routineIcon}>{routine.icon}</Text>
              <View style={styles.rhythmText}>
                <Text style={[styles.rhythmTitle, { color: theme.text }]}>{routine.title}</Text>
                <Muted>
                  {routine.steps.length} steps ·{' '}
                  {routine.steps.reduce((sum, step) => sum + step.estimateMinutes, 0)} min
                  {run ? ` · saved at step ${run.stepIndex + 1}` : ''}
                </Muted>
              </View>
              <Ionicons name="play-circle" size={32} color={routine.color} />
            </Card>
          </Pressable>
        );
      })}
      {archivedRoutines.length ? (
        <Card>
          <SectionHeading>Archived routines</SectionHeading>
          <Muted>Stored locally and ready to restore.</Muted>
          {archivedRoutines.map((routine) => (
            <View key={routine.id} style={styles.archivedRow}>
              <Text style={[styles.rhythmTitle, { color: theme.text }]}>
                {routine.icon} {routine.title}
              </Text>
              <View style={styles.archiveActions}>
                <Button
                  label="Restore"
                  variant="secondary"
                  onPress={() => void spark.restoreRoutine(routine)}
                />
                <Button
                  label="Edit"
                  variant="ghost"
                  onPress={() => router.push(`/routine/${routine.id}/edit`)}
                />
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={{ borderColor: theme.success }}>
        <Eyebrow>What Spark does not do</Eyebrow>
        <Body>
          It does not punish missed days, sell your habit history, or use random rewards to keep
          you compulsively checking. Dopamine here celebrates a choice you already made.
        </Body>
      </Card>
      <Button label="Manage settings" variant="ghost" onPress={() => router.push('/settings')} />
      <Card>
        <SectionHeading>Plan and share deliberately</SectionHeading>
        <Muted>These tools stay local unless you explicitly open the system share sheet or calendar.</Muted>
        <Button
          label="Gentle weekly reset"
          variant="secondary"
          onPress={() => router.push('/weekly-reset')}
        />
        <Button
          label="Personal experiments"
          variant="secondary"
          onPress={() => router.push('/experiments')}
        />
        <Button
          label="Share selected wins"
          variant="ghost"
          onPress={() => router.push('/share-progress')}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  levelCard: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  levelOrb: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  levelNumber: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  levelText: { flex: 1, gap: 5 },
  track: { height: 8, borderRadius: 99, overflow: 'hidden' },
  progress: { height: 8, borderRadius: 99 },
  chart: {
    height: 102,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4
  },
  barColumn: { flex: 1, alignItems: 'center', gap: 5 },
  bar: { width: '72%', borderRadius: 5, minHeight: 5 },
  dayLabel: { fontSize: 10 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  rhythmCard: { flexDirection: 'row', alignItems: 'center', padding: 13 },
  habitIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  habitEmoji: { fontSize: 23 },
  rhythmText: { flex: 1 },
  rhythmTitle: { fontSize: 16, fontWeight: '700' },
  percentage: { fontSize: 17, fontWeight: '800' },
  routine: { flexDirection: 'row', alignItems: 'center', padding: 13 },
  routineIcon: { fontSize: 30 },
  insights: { gap: 10 },
  insightHeading: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  archivedRow: { gap: 8, paddingVertical: 7 },
  archiveActions: { flexDirection: 'row', gap: 8 }
});
