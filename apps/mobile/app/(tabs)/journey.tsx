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
import { CollapsibleSection } from '../../src/components/CollapsibleSection';
import { MomentumCard } from '../../src/components/MomentumCard';
import { Screen } from '../../src/components/Screen';
import { Body, Eyebrow, H1, Muted, SectionHeading } from '../../src/components/Typography';
import { useSpark } from '../../src/state/SparkProvider';
import { useTheme } from '../../src/theme';
import { useI18n } from '../../src/i18n';

export default function JourneyScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const { locale, t } = useI18n();
  const summary = rewardSummaryFromTotal(spark.completionTotals.totalSparks);
  const days = recentDateKeys(new Date(), spark.timeZone, 14);
  const winsByDay = days.map(
    (day) =>
      spark.completionDailySummaries.find((summary) => summary.localDate === day)?.wins ?? 0
  );
  const maxWins = Math.max(1, ...winsByDay);
  const today = localDateKey(new Date(), spark.timeZone);
  const activeHabits = spark.habits.filter((habit) => !habit.archivedAt);
  const momentumHabits = activeHabits.filter((habit) => habit.momentum?.enabled);
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
  const recentCompletions = spark.completions.slice(0, 5);

  return (
    <Screen testID="journey-screen">
      <View>
        <Eyebrow>{t('reviewProgress')}</Eyebrow>
        <H1>{t('journey')}</H1>
        <Muted>
          Celebrate completed actions, see where every point came from, and shape your habits
          around what works.
        </Muted>
      </View>

      <Button label="Explain progress and points" variant="ghost" onPress={() => router.push('/guide')} />

      {spark.settings.showRewards ? (
      <Card style={[styles.levelCard, { backgroundColor: theme.surfaceAlt }]}>
        <View
          accessible
          accessibilityLabel={`Level ${summary.level}`}
          style={[styles.levelOrb, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.levelLabel}>LEVEL</Text>
          <Text style={styles.levelNumber}>{summary.level}</Text>
        </View>
        <View style={styles.levelText}>
          <SectionHeading>
            {summary.totalSparks} {summary.totalSparks === 1 ? 'Spark point' : 'Spark points'}
          </SectionHeading>
          <Muted>Tiny = 1 point · Standard = 2 · Stretch = 3</Muted>
          <Muted>
            {summary.nextLevelAt - summary.totalSparks}{' '}
            {summary.nextLevelAt - summary.totalSparks === 1 ? 'point' : 'points'} to Level{' '}
            {summary.level + 1}
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

      <CollapsibleSection
        title={t('recentCompletedActions')}
        summary={`${recentCompletions.length} most recent ${recentCompletions.length === 1 ? 'action' : 'actions'}`}
      >
        <Muted>Each row is an action you deliberately marked Done.</Muted>
        {recentCompletions.length ? (
          recentCompletions.map((completion) => {
            const habit = spark.habits.find((item) => item.id === completion.habitId);
            const variant = habit?.variants.find((item) => item.id === completion.variantId);
            return (
              <Pressable
                key={completion.id}
                accessibilityRole="button"
                accessibilityLabel={`Open history for ${habit?.title ?? 'this habit'}; ${completion.reward} ${completion.reward === 1 ? 'Spark point' : 'Spark points'}`}
                disabled={!habit}
                onPress={() => habit && router.push(`/habit/${habit.id}/history`)}
                style={[styles.winRow, { borderTopColor: theme.border }]}
              >
                <View style={styles.winText}>
                  <Text style={[styles.rhythmTitle, { color: theme.text }]}>
                    {habit?.icon ?? '✓'} {variant?.label ?? habit?.title ?? 'Logged action'}
                  </Text>
                  <Muted>{new Date(completion.occurredAt).toLocaleString(locale)}</Muted>
                </View>
                {spark.settings.showRewards ? (
                  <Text style={[styles.points, { color: theme.primary }]}>+{completion.reward}</Text>
                ) : (
                  <Text style={[styles.points, { color: theme.primary }]}>✓</Text>
                )}
              </Pressable>
            );
          })
        ) : (
          <Muted>Your first completed action will appear here.</Muted>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Last 14 days"
        summary={`${winsByDay.reduce((sum, value) => sum + value, 0)} completed actions across ${winsByDay.filter(Boolean).length} active days`}
      >
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
                {new Date(`${day}T12:00:00`).toLocaleDateString(locale, {
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
      </CollapsibleSection>

      <Card style={{ borderColor: theme.purple }}>
        <Eyebrow>Last 7 days</Eyebrow>
        <SectionHeading>
          {recentWins.length
            ? `${recentWins.length} completed ${recentWins.length === 1 ? 'action' : 'actions'}.`
            : 'Your next win starts here.'}
        </SectionHeading>
        <Body>
          {recentWins.length
            ? `You completed actions for ${new Set(recentWins.map((completion) => completion.habitId)).size} ${new Set(recentWins.map((completion) => completion.habitId)).size === 1 ? 'habit' : 'habits'}. ${
                tinyWins
                  ? `${tinyWins} ${tinyWins === 1 ? 'was a tiny action' : 'were tiny actions'}.`
                  : 'You used the action sizes that worked for you.'
              }`
            : 'Choose one clear action, complete it, and mark it Done to begin your progress.'}
        </Body>
      </Card>

      {spark.settings.insightsEnabled && insights.length ? (
        <CollapsibleSection
          title="Patterns you may want to know"
          summary={`${insights.length} ${insights.length === 1 ? 'pattern' : 'patterns'} based on your activity`}
        >
          <Muted>Calculated on this device from your completed actions and focus sessions.</Muted>
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
        </CollapsibleSection>
      ) : null}

      {momentumHabits.length ? (
        <CollapsibleSection
          title="Optional streaks"
          summary={`${momentumHabits.length} ${momentumHabits.length === 1 ? 'habit has' : 'habits have'} a streak turned on`}
        >
          <Muted>
            Streak saves and planned breaks maintain streak continuity. Completed periods and
            personal bests remain visible here.
          </Muted>
          {momentumHabits.map((habit) => (
            <MomentumCard key={habit.id} habit={habit} />
          ))}
        </CollapsibleSection>
      ) : null}

      <CollapsibleSection
        title={t('myHabits')}
        summary={`${activeHabits.length} active ${activeHabits.length === 1 ? 'habit' : 'habits'} · tap Show to manage`}
      >
      <Muted>Tap a habit to edit it, pause it, or review its full history.</Muted>
      <Button
        label={t('newHabit')}
        variant="secondary"
        onPress={() => router.push('/habit/new')}
      />
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
                    ? 'No completed actions yet'
                    : rhythm.comeback
                      ? 'Came back'
                      : 'Finding a rhythm'}
                </Muted>
              )}
            </Card>
          </Pressable>
        );
      })}
      </CollapsibleSection>

      <CollapsibleSection
        title={t('myRoutines')}
        summary={`${activeRoutines.length} active ${activeRoutines.length === 1 ? 'routine' : 'routines'} · one step at a time`}
      >
      <Button
        label={t('newRoutine')}
        variant="secondary"
        onPress={() => router.push('/routine/new')}
      />
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
                  label={t('restore')}
                  variant="secondary"
                  onPress={() => void spark.restoreRoutine(routine)}
                />
                <Button
                  label={t('edit')}
                  variant="ghost"
                  onPress={() => router.push(`/routine/${routine.id}/edit`)}
                />
              </View>
            </View>
          ))}
        </Card>
      ) : null}
      </CollapsibleSection>

      <Button label={t('manageSettings')} variant="ghost" onPress={() => router.push('/settings')} />
      <CollapsibleSection
        title="Plan or share"
        summary="Plan the week, try one change, or share only the wins you choose"
      >
        <Muted>These tools stay on this device unless you open your phone’s Share menu or calendar app.</Muted>
        <Button
          label="Plan my week"
          variant="secondary"
          onPress={() => router.push('/weekly-reset')}
        />
        <Button
          label={t('experiments')}
          variant="secondary"
          onPress={() => router.push('/experiments')}
        />
        <Button
          label={t('shareProgress')}
          variant="ghost"
          onPress={() => router.push('/share-progress')}
        />
      </CollapsibleSection>
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
  levelLabel: { color: '#FFFFFF', fontSize: 9, lineHeight: 10, fontWeight: '800' },
  levelNumber: { color: '#FFFFFF', fontSize: 25, lineHeight: 29, fontWeight: '800' },
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
    gap: 12
  },
  sectionHeadingText: { flex: 1, minWidth: 0, gap: 2 },
  addButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
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
  winRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 11, borderTopWidth: 1 },
  winText: { flex: 1 },
  points: { fontSize: 18, fontWeight: '800' },
  percentage: { fontSize: 17, fontWeight: '800' },
  routine: { flexDirection: 'row', alignItems: 'center', padding: 13 },
  routineIcon: { fontSize: 30 },
  insights: { gap: 10 },
  insightHeading: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  archivedRow: { gap: 8, paddingVertical: 7 },
  archiveActions: { flexDirection: 'row', gap: 8 }
});
