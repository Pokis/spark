import {
  addCalendarDays,
  localDateKey,
  rewardSummaryFromTotal,
  scheduleLabel,
  type Completion,
  type Habit
} from '@spark/domain';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { CollapsibleSection } from '../../src/components/CollapsibleSection';
import { MomentumCard } from '../../src/components/MomentumCard';
import { Screen } from '../../src/components/Screen';
import { Body, Eyebrow, H1, Muted, SectionHeading } from '../../src/components/Typography';
import { loadHabitCompletionDates } from '../../src/data/database';
import {
  habitDayStatus,
  monthCalendarDays,
  monthKey,
  monthTitle,
  shiftMonth,
  weekCalendarDays,
  type CalendarDay,
  type HabitDayStatus
} from '../../src/lib/habitCalendar';
import { useSpark } from '../../src/state/SparkProvider';
import { useTheme } from '../../src/theme';
import { useI18n } from '../../src/i18n';

type ProgressView = 'week' | 'month' | 'record';
const weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function statusColor(status: HabitDayStatus, habit: Habit, theme: ReturnType<typeof useTheme>) {
  if (status === 'completed') return habit.color;
  if (status === 'scheduled') return `${habit.color}25`;
  if (status === 'flexible') return theme.surfaceAlt;
  return 'transparent';
}

function readableStatus(status: HabitDayStatus): string {
  if (status === 'outside') return 'outside this month';
  if (status === 'completed') return 'completed';
  if (status === 'scheduled') return 'scheduled';
  if (status === 'flexible') return 'available on a flexible schedule';
  return 'not scheduled';
}

function MonthHabitCard({
  habit,
  days,
  completions,
  onOpen
}: {
  habit: Habit;
  days: CalendarDay[];
  completions: Array<Pick<Completion, 'habitId' | 'localDate'>>;
  onOpen(): void;
}) {
  const theme = useTheme();
  return (
    <Card style={styles.monthHabitCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open history for ${habit.title}`} onPress={onOpen} style={styles.habitHeading}>
        <Text style={styles.habitEmoji}>{habit.icon}</Text>
        <View style={styles.habitTitleArea}>
          <Text style={[styles.habitTitle, { color: theme.text }]} numberOfLines={1}>{habit.title}</Text>
          <Muted numberOfLines={1}>{scheduleLabel(habit.schedule)}</Muted>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </Pressable>
      <View style={styles.weekdayHeader}>
        {weekdayLabels.map((label, index) => <Text key={`${label}-${index}`} style={[styles.weekday, { color: theme.textMuted }]}>{label}</Text>)}
      </View>
      <View style={styles.monthGrid}>
        {days.map((day) => {
          const status = habitDayStatus(habit, day.dateKey, completions, day.inMonth);
          return (
            <View
              key={day.dateKey}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${day.dateKey}: ${readableStatus(status)}`}
              style={[
                styles.monthDay,
                {
                  backgroundColor: statusColor(status, habit, theme),
                  borderColor: status === 'scheduled' ? `${habit.color}70` : status === 'flexible' ? theme.border : 'transparent',
                  opacity: status === 'outside' ? 0.15 : 1
                }
              ]}
            >
              <Text style={[styles.monthDayText, { color: status === 'completed' ? '#FFFFFF' : theme.textMuted }]}>{day.day}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

export default function JourneyScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const { locale, t } = useI18n();
  const today = localDateKey(new Date(), spark.timeZone);
  const [view, setView] = useState<ProgressView>('month');
  const [visibleMonth, setVisibleMonth] = useState(monthKey(today));
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [calendarCompletions, setCalendarCompletions] = useState<Array<Pick<Completion, 'habitId' | 'localDate'>>>(spark.completions);
  const activeHabits = useMemo(
    () => spark.habits.filter((habit) => !habit.archivedAt).sort((a, b) => a.sortOrder - b.sortOrder),
    [spark.habits]
  );
  const archivedHabits = spark.habits.filter((habit) => habit.archivedAt);
  const monthDays = useMemo(() => monthCalendarDays(visibleMonth), [visibleMonth]);
  const weekDays = useMemo(() => weekCalendarDays(weekAnchor), [weekAnchor]);
  const momentumHabits = activeHabits.filter((habit) => habit.momentum?.enabled && spark.settings.streaksEnabled);
  const rewardSummary = rewardSummaryFromTotal(spark.completionTotals.totalSparks);

  useEffect(() => {
    let mounted = true;
    void Promise.all(activeHabits.map((habit) => loadHabitCompletionDates(habit.id)))
      .then((groups) => {
        if (mounted) setCalendarCompletions(groups.flat());
      })
      .catch(() => {
        if (mounted) setCalendarCompletions(spark.completions);
      });
    return () => { mounted = false; };
  }, [activeHabits, spark.completions]);

  const recordByHabit = activeHabits.map((habit) => ({
    habit,
    count: calendarCompletions.filter((completion) => completion.habitId === habit.id).length
  }));

  return (
    <Screen testID="journey-screen">
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Eyebrow>Habit history</Eyebrow>
          <H1>{t('journey')}</H1>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Add a habit" onPress={() => router.push('/habit/new')} style={[styles.add, { backgroundColor: theme.surfaceAlt }]}>
          <Ionicons name="add" size={22} color={theme.primary} />
        </Pressable>
      </View>

      <View style={[styles.segment, { backgroundColor: theme.surfaceAlt }]}>
        {([['week', 'Week'], ['month', 'Month'], ['record', 'Record']] as const).map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: view === value }}
            onPress={() => setView(value)}
            style={[styles.segmentButton, view === value && { backgroundColor: theme.surface }]}
          >
            <Text style={[styles.segmentText, { color: view === value ? theme.primary : theme.textMuted }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {activeHabits.length === 0 ? (
        <Card style={styles.emptyCard}>
          <SectionHeading>Your habits will appear here</SectionHeading>
          <Body>The calendar fills when you complete a habit.</Body>
          <Button label="Create a habit" onPress={() => router.push('/habit/new')} />
        </Card>
      ) : null}

      {activeHabits.length > 0 && view === 'month' ? (
        <>
          <View style={styles.periodNav}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setVisibleMonth((value) => shiftMonth(value, -1))} style={styles.arrow}>
              <Ionicons name="chevron-back" size={25} color={theme.primary} />
            </Pressable>
            <SectionHeading>{monthTitle(visibleMonth, locale)}</SectionHeading>
            <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setVisibleMonth((value) => shiftMonth(value, 1))} style={styles.arrow}>
              <Ionicons name="chevron-forward" size={25} color={theme.primary} />
            </Pressable>
          </View>
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: theme.primary }]} /><Muted>Completed</Muted>
            <View style={[styles.legendDot, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, borderWidth: 1 }]} /><Muted>Scheduled or flexible</Muted>
          </View>
          {activeHabits.map((habit) => (
            <MonthHabitCard key={habit.id} habit={habit} days={monthDays} completions={calendarCompletions} onOpen={() => router.push(`/habit/${habit.id}/history`)} />
          ))}
        </>
      ) : null}

      {activeHabits.length > 0 && view === 'week' ? (
        <>
          <View style={styles.periodNav}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous week" onPress={() => setWeekAnchor((value) => addCalendarDays(value, -7))} style={styles.arrow}>
              <Ionicons name="chevron-back" size={25} color={theme.primary} />
            </Pressable>
            <SectionHeading>{weekDays[0]?.dateKey.slice(5)} – {weekDays[6]?.dateKey.slice(5)}</SectionHeading>
            <Pressable accessibilityRole="button" accessibilityLabel="Next week" onPress={() => setWeekAnchor((value) => addCalendarDays(value, 7))} style={styles.arrow}>
              <Ionicons name="chevron-forward" size={25} color={theme.primary} />
            </Pressable>
          </View>
          <Card style={styles.weekCard}>
            <View style={styles.weekHeaderRow}>
              <View style={styles.weekHabitSpacer} />
              {weekDays.map((day, index) => (
                <View key={day.dateKey} style={styles.weekCell}>
                  <Text style={[styles.weekday, { color: theme.textMuted }]}>{weekdayLabels[index]}</Text>
                  <Text style={[styles.weekDate, { color: day.dateKey === today ? theme.primary : theme.text }]}>{day.day}</Text>
                </View>
              ))}
            </View>
            {activeHabits.map((habit) => (
              <Pressable
                key={habit.id}
                accessibilityRole="button"
                accessibilityLabel={`${habit.title}. ${weekDays.map((day) => `${day.dateKey}: ${readableStatus(habitDayStatus(habit, day.dateKey, calendarCompletions))}`).join('. ')}`}
                onPress={() => router.push(`/habit/${habit.id}/history`)}
                style={[styles.weekHabitRow, { borderTopColor: theme.border }]}
              >
                <View style={styles.weekHabitName}>
                  <Text style={styles.weekHabitEmoji}>{habit.icon}</Text>
                  <Text style={[styles.weekHabitTitle, { color: theme.text }]} numberOfLines={1}>{habit.title}</Text>
                </View>
                {weekDays.map((day) => {
                  const status = habitDayStatus(habit, day.dateKey, calendarCompletions);
                  return <View key={day.dateKey} style={styles.weekCell}><View style={[styles.weekMark, { backgroundColor: statusColor(status, habit, theme), borderColor: status === 'scheduled' || status === 'flexible' ? theme.border : 'transparent' }]}>{status === 'completed' ? <Text style={styles.check}>✓</Text> : null}</View></View>;
                })}
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}

      {activeHabits.length > 0 && view === 'record' ? (
        <>
          <Card style={styles.recordSummary}>
            <View><Text style={[styles.bigNumber, { color: theme.text }]}>{spark.completionTotals.totalWins}</Text><Muted>Total completions</Muted></View>
            <View><Text style={[styles.bigNumber, { color: theme.text }]}>{activeHabits.length}</Text><Muted>Active habits</Muted></View>
            {spark.settings.showRewards ? <View><Text style={[styles.bigNumber, { color: theme.text }]}>{rewardSummary.totalSparks}</Text><Muted>Points</Muted></View> : null}
          </Card>
          <View style={styles.sectionHeader}>
            <SectionHeading>Habits</SectionHeading>
            <Button label="Add" variant="ghost" onPress={() => router.push('/habit/new')} />
          </View>
          {recordByHabit.map(({ habit, count }) => (
            <Pressable key={habit.id} accessibilityRole="button" accessibilityLabel={`Edit ${habit.title}`} onPress={() => router.push(`/habit/${habit.id}`)}>
              <Card style={styles.recordHabit}>
                <Text style={styles.habitEmoji}>{habit.icon}</Text>
                <View style={styles.habitTitleArea}>
                  <Text style={[styles.habitTitle, { color: theme.text }]}>{habit.title}</Text>
                  <Muted>{scheduleLabel(habit.schedule)} · {count} completed</Muted>
                </View>
                <Ionicons name="chevron-forward" size={19} color={theme.textMuted} />
              </Card>
            </Pressable>
          ))}

          {momentumHabits.length ? (
            <CollapsibleSection title="Streaks" summary={`${momentumHabits.length} enabled`}>
              {momentumHabits.map((habit) => <MomentumCard key={habit.id} habit={habit} />)}
            </CollapsibleSection>
          ) : null}

          <CollapsibleSection title="Recent completions" summary="Open a habit to correct or add history">
            {spark.completions.slice(0, 12).map((completion) => {
              const habit = spark.habits.find((candidate) => candidate.id === completion.habitId);
              return (
                <Pressable key={completion.id} accessibilityRole="button" accessibilityLabel={habit ? `Open history for ${habit.title}` : 'Completion'} disabled={!habit} onPress={() => habit && router.push(`/habit/${habit.id}/history`)} style={[styles.completionRow, { borderTopColor: theme.border }]}>
                  <Text style={styles.completedCheck}>✓</Text>
                  <View style={styles.habitTitleArea}>
                    <Text style={[styles.completionTitle, { color: theme.text }]}>{habit?.icon ?? ''} {habit?.title ?? 'Habit'}</Text>
                    <Muted>{new Date(completion.occurredAt).toLocaleString(locale)}</Muted>
                  </View>
                </Pressable>
              );
            })}
          </CollapsibleSection>
        </>
      ) : null}

      {archivedHabits.length && view === 'record' ? (
        <CollapsibleSection title="Archived habits" summary={`${archivedHabits.length} saved`}>
          {archivedHabits.map((habit) => <Button key={habit.id} label={`${habit.icon} ${habit.title}`} variant="ghost" onPress={() => router.push(`/habit/${habit.id}`)} />)}
        </CollapsibleSection>
      ) : null}

      <Button label="Calendar and progress guide" variant="ghost" onPress={() => router.push('/tutorials?topic=calendar')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  add: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', borderRadius: 16, padding: 4 },
  segmentButton: { flex: 1, minHeight: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 15, fontWeight: '800' },
  emptyCard: { gap: 10 },
  periodNav: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  legendDot: { width: 13, height: 13, borderRadius: 4, marginLeft: 4 },
  monthHabitCard: { padding: 13, gap: 10 },
  habitHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  habitEmoji: { fontSize: 24 },
  habitTitleArea: { flex: 1, minWidth: 0, gap: 2 },
  habitTitle: { fontSize: 15, fontWeight: '800' },
  weekdayHeader: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  monthDay: { width: '12.1%', aspectRatio: 1, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  monthDayText: { fontSize: 10, fontWeight: '700' },
  weekCard: { padding: 10, gap: 0 },
  weekHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  weekHabitSpacer: { width: 116 },
  weekCell: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 2 },
  weekDate: { fontSize: 12, fontWeight: '800' },
  weekHabitRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1 },
  weekHabitName: { width: 116, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 6 },
  weekHabitEmoji: { fontSize: 18 },
  weekHabitTitle: { flex: 1, fontSize: 12, fontWeight: '700' },
  weekMark: { width: 25, height: 25, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  check: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  recordSummary: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  bigNumber: { fontSize: 27, fontWeight: '900', textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recordHabit: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  completionRow: { minHeight: 52, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  completedCheck: { color: '#20B8B2', fontSize: 18, fontWeight: '900' },
  completionTitle: { fontSize: 14, fontWeight: '700' }
});
