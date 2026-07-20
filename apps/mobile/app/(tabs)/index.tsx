import {
  buildTodayPlan,
  localDateKey,
  type Capacity,
  type Completion,
  type HabitContext,
  type HabitVariant
} from '@spark/domain';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { CapacityPicker } from '../../src/components/CapacityPicker';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { CollapsibleSection } from '../../src/components/CollapsibleSection';
import { HabitCard } from '../../src/components/HabitCard';
import { Screen } from '../../src/components/Screen';
import { SparkBurst } from '../../src/components/SparkBurst';
import { Body, Eyebrow, H1, Muted, SectionHeading } from '../../src/components/Typography';
import { friendlyDate } from '../../src/lib/date';
import { isQuietNow } from '../../src/lib/sensory';
import { useSpark } from '../../src/state/SparkProvider';
import { useTheme } from '../../src/theme';
import { useI18n } from '../../src/i18n';

const timeOptions = [2, 5, 10, 20];
const contextOptions = [
  ['home', 'Home'],
  ['work', 'Work'],
  ['outside', 'Outside'],
  ['phone', 'Phone']
] as const;

export default function TodayScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const { locale, t } = useI18n();
  const today = localDateKey(new Date(), spark.timeZone);
  const checkIn = spark.dailyCheckIns.find((item) => item.localDate === today);
  const [capacity, setCapacity] = useState<Capacity>(checkIn?.capacity ?? 'steady');
  const [minutes, setMinutes] = useState<number | undefined>(checkIn?.availableMinutes ?? undefined);
  const [context, setContext] = useState<HabitContext | undefined>(checkIn?.context ?? undefined);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savingHabitId, setSavingHabitId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastCompletion, setLastCompletion] = useState<{ completion: Completion; title: string } | null>(null);
  const [celebration, setCelebration] = useState<{ title: string; reward: number } | null>(null);

  const activeHabits = useMemo(
    () => spark.habits.filter((habit) => !habit.archivedAt),
    [spark.habits]
  );
  const completedToday = useMemo(
    () => spark.completions.filter((completion) => completion.localDate === today),
    [spark.completions, today]
  );
  const completedHabitIds = useMemo(
    () => new Set(completedToday.map((completion) => completion.habitId)),
    [completedToday]
  );
  const suggestions = useMemo(() => {
    const plan = buildTodayPlan({
      habits: activeHabits,
      completions: spark.completions,
      now: new Date(),
      timeZone: spark.timeZone,
      capacity: spark.settings.adaptiveSuggestionsEnabled ? capacity : 'steady',
      availableMinutes: spark.settings.adaptiveSuggestionsEnabled ? minutes : undefined,
      context: spark.settings.adaptiveSuggestionsEnabled ? context : undefined,
      limit: Math.max(1, activeHabits.length)
    });
    return spark.settings.adaptiveSuggestionsEnabled
      ? plan
      : [...plan].sort((a, b) => a.habit.sortOrder - b.habit.sortOrder);
  }, [activeHabits, capacity, context, minutes, spark.completions, spark.settings.adaptiveSuggestionsEnabled, spark.timeZone]);

  async function saveCheckIn(nextCapacity = capacity, nextMinutes = minutes, nextContext = context) {
    setCapacity(nextCapacity);
    setMinutes(nextMinutes);
    setContext(nextContext);
    await spark.setCheckIn(nextCapacity, nextMinutes ?? null, nextContext ?? null);
  }

  async function complete(habitId: string, variant: HabitVariant) {
    if (savingHabitId) return;
    const habit = spark.habits.find((candidate) => candidate.id === habitId);
    if (!habit) return;
    setSavingHabitId(habitId);
    try {
      const completion = await spark.completeHabit(habit, variant, 'today', { context });
      setLastCompletion({ completion, title: habit.title });
      if (!isQuietNow(spark.settings) && spark.settings.sensoryProfile === 'celebratory') {
        setCelebration({ title: habit.title, reward: completion.reward });
      }
    } finally {
      setSavingHabitId(null);
    }
  }

  async function undoLast() {
    if (!lastCompletion) return;
    await spark.undoCompletion(lastCompletion.completion.id);
    setLastCompletion(null);
  }

  return (
    <>
      <Screen
        testID="today-screen"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.primary}
            onRefresh={() => {
              setRefreshing(true);
              void spark.refresh().finally(() => setRefreshing(false));
            }}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Eyebrow>{friendlyDate(new Date(), locale)}</Eyebrow>
            <H1>{t('today')}</H1>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => router.push('/settings')}
            style={[styles.settings, { backgroundColor: theme.surface }]}
          >
            <Ionicons name="settings-outline" size={24} color={theme.text} />
          </Pressable>
        </View>

        {activeHabits.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIcon, { backgroundColor: `${theme.primary}18` }]}>
              <Ionicons name="checkmark-circle-outline" size={38} color={theme.primary} />
            </View>
            <SectionHeading>Start with one habit</SectionHeading>
            <Body>Name it, choose how often it should happen, and you’re ready.</Body>
            <Button label="Create my first habit" onPress={() => router.push('/habit/new')} />
            <Button label="How habit tracking works" variant="ghost" onPress={() => router.push('/tutorials?topic=schedules')} />
          </Card>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitle}>
                <SectionHeading>Up next</SectionHeading>
                <Muted>
                  {suggestions.length
                    ? `${suggestions.length} ${suggestions.length === 1 ? 'habit' : 'habits'} ready today`
                    : completedToday.length
                      ? 'Everything scheduled for today is complete.'
                      : 'Nothing is scheduled for today.'}
                </Muted>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add a habit"
                onPress={() => router.push('/habit/new')}
                style={[styles.addButton, { backgroundColor: theme.surfaceAlt }]}
              >
                <Ionicons name="add" size={20} color={theme.primary} />
                <Text style={[styles.addText, { color: theme.primary }]}>Add habit</Text>
              </Pressable>
            </View>

            {spark.settings.adaptiveSuggestionsEnabled ? (
              <CollapsibleSection
                title="Adjust suggestions"
                summary={`Energy, time, and place${filtersOpen ? '' : ' · optional'}`}
                expanded={filtersOpen}
                onExpandedChange={setFiltersOpen}
              >
                <CapacityPicker value={capacity} onChange={(value) => void saveCheckIn(value, minutes, context)} />
                <Muted>Available time</Muted>
                <View style={styles.chips}>
                  {timeOptions.map((value) => <Chip key={value} label={`${value} min`} selected={minutes === value} onPress={() => void saveCheckIn(capacity, value, context)} />)}
                  <Chip label="Any" selected={minutes == null} onPress={() => void saveCheckIn(capacity, undefined, context)} />
                </View>
                <Muted>Place</Muted>
                <View style={styles.chips}>
                  {contextOptions.map(([value, label]) => <Chip key={value} label={label} selected={context === value} onPress={() => void saveCheckIn(capacity, minutes, context === value ? undefined : value)} />)}
                  <Chip label="Anywhere" selected={!context} onPress={() => void saveCheckIn(capacity, minutes, undefined)} />
                </View>
              </CollapsibleSection>
            ) : null}

            {suggestions.map((suggestion) => (
              <HabitCard
                key={suggestion.habit.id}
                suggestion={suggestion}
                saving={savingHabitId === suggestion.habit.id}
                showSizes={spark.settings.actionSizesEnabled}
                showRewards={spark.settings.showRewards}
                doneLabel={t('done')}
                showExplanation={spark.settings.adaptiveSuggestionsEnabled}
                showExtraActions={spark.settings.adaptiveSuggestionsEnabled}
                onComplete={(variant) => void complete(suggestion.habit.id, variant)}
                onTiny={spark.settings.actionSizesEnabled
                  ? () => {
                      const tiny = suggestion.habit.variants.find((variant) => variant.kind === 'tiny');
                      if (tiny) void complete(suggestion.habit.id, tiny);
                    }
                  : undefined}
                onFocus={spark.settings.focusToolEnabled
                  ? (focusMinutes) => router.push({ pathname: '/(tabs)/focus', params: { title: suggestion.habit.title, minutes: String(focusMinutes), habitId: suggestion.habit.id } })
                  : undefined}
                onEdit={() => router.push(`/habit/${suggestion.habit.id}`)}
              />
            ))}

            {lastCompletion ? (
              <View style={[styles.undoBar, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <Text style={[styles.undoText, { color: theme.text }]}>✓ {lastCompletion.title} completed</Text>
                <Pressable accessibilityRole="button" onPress={() => void undoLast()}>
                  <Text style={[styles.undoAction, { color: theme.primary }]}>Undo</Text>
                </Pressable>
              </View>
            ) : null}

            {completedToday.length ? (
              <CollapsibleSection
                title="Completed today"
                summary={`${new Set(completedToday.map((completion) => completion.habitId)).size} ${completedHabitIds.size === 1 ? 'habit' : 'habits'}`}
              >
                {activeHabits
                  .filter((habit) => completedHabitIds.has(habit.id))
                  .map((habit) => (
                    <Pressable key={habit.id} accessibilityRole="button" accessibilityLabel={`Open history for ${habit.title}`} onPress={() => router.push(`/habit/${habit.id}/history`)} style={styles.completedRow}>
                      <Text style={styles.completedIcon}>✓</Text>
                      <Text style={[styles.completedTitle, { color: theme.text }]}>{habit.icon} {habit.title}</Text>
                      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                    </Pressable>
                  ))}
              </CollapsibleSection>
            ) : null}

            <View style={styles.footerActions}>
              <Button label="Open habit calendar" variant="secondary" onPress={() => router.push('/(tabs)/journey')} />
              {spark.settings.captureToolEnabled ? <Button label="Quick capture" variant="ghost" onPress={() => router.push('/quick-capture')} /> : null}
              {spark.settings.routinesEnabled && spark.routineRuns[0] ? <Button label="Resume routine" variant="ghost" onPress={() => router.push(`/routine/${spark.routineRuns[0]!.routineId}`)} /> : null}
            </View>
          </>
        )}
      </Screen>

      <SparkBurst
        visible={Boolean(celebration)}
        title={celebration?.title ?? ''}
        reward={celebration?.reward ?? 1}
        reducedMotion={spark.settings.reducedMotion}
        sensoryProfile={spark.settings.sensoryProfile}
        celebrationStyle={spark.settings.celebrationStyle}
        showReward={spark.settings.showRewards}
        onDismiss={() => setCelebration(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  settings: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { alignItems: 'stretch', padding: 20, gap: 12 },
  emptyIcon: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { flex: 1, minWidth: 0 },
  addButton: { minHeight: 44, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  addText: { fontSize: 13, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  undoBar: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  undoText: { flex: 1, fontSize: 14, fontWeight: '700' },
  undoAction: { fontSize: 14, fontWeight: '800' },
  completedRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9 },
  completedIcon: { color: '#20B8B2', fontSize: 18, fontWeight: '900' },
  completedTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  footerActions: { gap: 8, paddingTop: 4 }
});
