import {
  addCalendarDays,
  buildTodayPlan,
  localDateKey,
  rewardSummaryFromTotal,
  type Capacity,
  type Completion,
  type CompletionTag,
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
import { HabitCard } from '../../src/components/HabitCard';
import { Screen } from '../../src/components/Screen';
import { SparkBurst } from '../../src/components/SparkBurst';
import { TutorialPrompt } from '../../src/components/TutorialPrompt';
import { Body, Eyebrow, H1, Muted, SectionHeading } from '../../src/components/Typography';
import { friendlyDate } from '../../src/lib/date';
import { useSpark } from '../../src/state/SparkProvider';
import { isQuietNow } from '../../src/lib/sensory';
import { activeExperimentForHabit } from '../../src/lib/experiments';
import {
  currentWeeklyPlan,
  weeklyPlanAppliesTomorrow
} from '../../src/lib/weeklyPlanning';
import { useTheme } from '../../src/theme';

const timeOptions = [2, 5, 10, 20];
const contextOptions = [
  ['home', 'Home'],
  ['work', 'Work'],
  ['outside', 'Outside'],
  ['phone', 'Phone']
] as const;
const capacityFeedback: Record<Capacity, string> = {
  empty: 'Running-low selected. Spark is showing gentler action sizes.',
  steady: 'Steady selected. Spark updated today’s suggestions.',
  ready: 'Ready selected. Spark can include a stretch option.'
};

function currentPeriod(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
}

export default function TodayScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const today = localDateKey(new Date(), spark.timeZone);
  const yesterday = addCalendarDays(today, -1);
  const checkIn = spark.dailyCheckIns.find((item) => item.localDate === today);
  const yesterdayCheckIn = spark.dailyCheckIns.find((item) => item.localDate === yesterday);
  const weeklyPlan = currentWeeklyPlan(spark.weeklyPlans, today);
  const weeklyPlanIsForToday = weeklyPlanAppliesTomorrow(
    weeklyPlan,
    today,
    spark.timeZone
  );
  const rememberedContext = spark.settings.rememberContextByTime
    ? (weeklyPlanIsForToday ? weeklyPlan?.tomorrowContext : null) ??
      spark.settings.contextByPeriod[currentPeriod()]
    : null;
  const [capacity, setCapacity] = useState<Capacity | null>(checkIn?.capacity ?? null);
  const [minutes, setMinutes] = useState<number | undefined>(
    checkIn?.availableMinutes ?? undefined
  );
  const [timeChosen, setTimeChosen] = useState(Boolean(checkIn));
  const [context, setContext] = useState<HabitContext | undefined>(
    checkIn?.context ?? rememberedContext ?? undefined
  );
  const [checkInExpanded, setCheckInExpanded] = useState(!checkIn);
  const [pickedHabitId, setPickedHabitId] = useState<string | null>(null);
  const [savingHabitId, setSavingHabitId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{
    title: string;
    reward: number;
    completion: Completion;
  } | null>(null);
  const [undoEntry, setUndoEntry] = useState<{
    title: string;
    reward: number;
    completion: Completion;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const rewards = rewardSummaryFromTotal(spark.completionTotals.totalSparks);

  const eligiblePlan = useMemo(() => {
    const deferred = new Set(
      spark.habitDeferrals
        .filter((item) => Date.parse(item.until) > Date.now())
        .map((item) => item.habitId)
    );
    const weeklyHabitIds = new Set(weeklyPlan?.selectedHabitIds ?? []);
    const tomorrowTinyHabitId = weeklyPlanIsForToday
      ? weeklyPlan?.tomorrowTinyHabitId
      : null;
    return buildTodayPlan({
      habits: spark.habits,
      completions: spark.completions,
      now: new Date(),
      timeZone: spark.timeZone,
      capacity:
        spark.settings.minimumViableDay || spark.settings.simpleMode
          ? 'empty'
          : capacity ?? 'steady',
      availableMinutes: timeChosen ? minutes : undefined,
      context,
      limit: spark.settings.minimumViableDay || spark.settings.simpleMode ? 1 : 6
    })
      .filter((suggestion) => !deferred.has(suggestion.habit.id))
      .map((suggestion) => {
        const experiment = activeExperimentForHabit(
          spark.personalExperiments,
          suggestion.habit.id,
          'tiny_week'
        );
        const tiny = suggestion.habit.variants.find((variant) => variant.kind === 'tiny');
        return (experiment || suggestion.habit.id === tomorrowTinyHabitId) && tiny
          ? { ...suggestion, variant: tiny }
          : suggestion;
      })
      .sort((a, b) => {
        if (a.habit.id === tomorrowTinyHabitId) return -1;
        if (b.habit.id === tomorrowTinyHabitId) return 1;
        return Number(weeklyHabitIds.has(b.habit.id)) - Number(weeklyHabitIds.has(a.habit.id));
      });
  }, [
    capacity,
    context,
    minutes,
    spark.completions,
    spark.habitDeferrals,
    spark.habits,
    spark.settings.minimumViableDay,
    spark.settings.simpleMode,
    spark.personalExperiments,
    weeklyPlan,
    weeklyPlanIsForToday,
    spark.timeZone,
    timeChosen
  ]);

  const plan = pickedHabitId
    ? eligiblePlan.filter((suggestion) => suggestion.habit.id === pickedHabitId)
    : eligiblePlan.slice(
        0,
        spark.settings.minimumViableDay || spark.settings.simpleMode ? 1 : 3
      );
  const winsToday = spark.completions.filter((item) => item.localDate === today);
  const blankReturnWindow = [1, 2, 3].every((daysAgo) => {
    const date = addCalendarDays(today, -daysAgo);
    return !spark.completions.some((completion) => completion.localDate === date);
  });
  const returnSuggestion = blankReturnWindow
    ? eligiblePlan.find((suggestion) =>
        spark.completions.some(
          (completion) =>
            completion.habitId === suggestion.habit.id &&
            completion.variantKind === 'tiny'
        )
      )
    : undefined;
  const visiblePlan =
    returnSuggestion && !pickedHabitId
      ? plan.filter((suggestion) => suggestion.habit.id !== returnSuggestion.habit.id)
      : plan;

  async function chooseCapacity(value: Capacity) {
    setCapacity(value);
    setNotice(capacityFeedback[value]);
    await spark.setCheckIn(value, timeChosen ? minutes ?? null : null, context ?? null);
    if (timeChosen) setCheckInExpanded(false);
  }

  async function chooseMinutes(value: number | undefined) {
    setMinutes(value);
    setTimeChosen(true);
    setNotice(
      value == null
        ? 'No-clock selected. Spark will not filter actions by time.'
        : `${value} minutes selected. Today’s suggestions were updated.`
    );
    await spark.setCheckIn(capacity ?? 'steady', value ?? null, context ?? null);
    if (capacity) setCheckInExpanded(false);
  }

  async function chooseContext(value: HabitContext | undefined) {
    setContext(value);
    setNotice(
      value ? `${value[0]!.toUpperCase()}${value.slice(1)} context selected.` : 'Context filter cleared.'
    );
    await spark.setCheckIn(capacity ?? 'steady', timeChosen ? minutes ?? null : null, value ?? null);
  }

  async function useYesterday() {
    if (!yesterdayCheckIn) return;
    setCapacity(yesterdayCheckIn.capacity);
    setMinutes(yesterdayCheckIn.availableMinutes ?? undefined);
    setTimeChosen(true);
    setContext(yesterdayCheckIn.context ?? undefined);
    await spark.setCheckIn(
      yesterdayCheckIn.capacity,
      yesterdayCheckIn.availableMinutes,
      yesterdayCheckIn.context ?? null
    );
    setCheckInExpanded(false);
    setNotice('Yesterday’s energy, time, and context were copied. Today’s suggestions changed.');
  }

  async function toggleOneThingDay() {
    const enabled = !spark.settings.minimumViableDay;
    setNotice(
      enabled
        ? 'One-thing day is on. Today now shows only one tiny action.'
        : 'One-thing day is off. Your flexible menu is visible again.'
    );
    await spark.updateSetting('minimumViableDay', enabled);
  }

  async function complete(
    title: string,
    variant: HabitVariant,
    habitId: string
  ): Promise<void> {
    if (savingHabitId) return;
    const habit = spark.habits.find((candidate) => candidate.id === habitId);
    if (!habit) return;
    setSavingHabitId(habitId);
    setNotice(null);
    try {
      const completion = await spark.completeHabit(habit, variant, 'today', { context });
      const entry = { title, reward: completion.reward, completion };
      if (!isQuietNow(spark.settings)) setCelebration(entry);
      setUndoEntry(entry);
    } catch (reason) {
      if (!(reason instanceof Error) || !reason.message.includes('already being saved')) {
        setNotice('Spark could not save that win yet. Your button is ready to try again.');
      }
    } finally {
      setSavingHabitId(null);
    }
  }

  function startFocus(title: string, minutes: number, habitId: string) {
    router.push({
      pathname: '/(tabs)/focus',
      params: { title, minutes: String(minutes), habitId }
    });
  }

  async function toggleTag(tag: CompletionTag) {
    if (!celebration) return;
    const tags = celebration.completion.tags ?? [];
    const next = tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
    await spark.setCompletionTags(celebration.completion.id, next);
    setCelebration((current) =>
      current ? { ...current, completion: { ...current.completion, tags: next } } : null
    );
    setUndoEntry((current) =>
      current?.completion.id === celebration.completion.id
        ? { ...current, completion: { ...current.completion, tags: next } }
        : current
    );
  }

  const announcement = spark.remoteConfig.defaults.announcementsEnabled
    ? spark.remoteConfig.announcements.find((item) => item.enabled)
    : undefined;

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
            <Eyebrow>{friendlyDate()}</Eyebrow>
            <H1>
              {spark.entitlement.premium
                ? `${spark.settings.appIconStyle === 'calm' ? '◌' : spark.settings.appIconStyle === 'midnight' ? '✧' : '✦'} `
                : ''}
              {spark.settings.displayName
                ? `Hi ${spark.settings.displayName}`
                : 'What feels possible?'}
            </H1>
            {spark.entitlement.premium && spark.settings.supporterBadgeVisible ? (
              <Eyebrow>✦ Spark supporter</Eyebrow>
            ) : null}
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

        {spark.settings.simpleMode ? (
          <Card style={{ borderColor: theme.purple }}>
            <Eyebrow>Simple mode</Eyebrow>
            <SectionHeading>Only the next useful doorways.</SectionHeading>
            <View style={styles.quickActions}>
              <Button
                label="Quick capture"
                variant="secondary"
                onPress={() => router.push('/quick-capture')}
              />
              <Button
                label="Start 2-minute focus"
                variant="secondary"
                onPress={() =>
                  router.push({ pathname: '/(tabs)/focus', params: { minutes: '2' } })
                }
              />
            </View>
            {spark.routineRuns[0] ? (
              <Button
                label="Resume running routine"
                variant="secondary"
                onPress={() => router.push(`/routine/${spark.routineRuns[0]!.routineId}`)}
              />
            ) : null}
            <Button label="Help me now" variant="ghost" onPress={() => router.push('/help')} />
          </Card>
        ) : null}

        {spark.settings.progressiveHelpEnabled &&
        !spark.settings.simpleMode &&
        spark.completionTotals.totalWins < 3 ? (
          <TutorialPrompt
            id="getting-started"
            eyebrow="New here? Start with this"
            title="Choose one action you already did—or want to do now."
            body="See how Today, action sizes, wins, and points work in a three-step tour. You can dismiss it now and replay it later from Settings."
          />
        ) : null}

        {spark.settings.showRewards && !spark.settings.simpleMode ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open Progress. ${rewards.totalSparks} Spark points and ${winsToday.length} wins today.`}
            onPress={() => router.push('/(tabs)/journey')}
          >
            <Card style={[styles.scoreCard, { backgroundColor: theme.surfaceAlt }]}>
              <View style={styles.scoreDetails}>
                <Text style={[styles.score, { color: theme.text }]}>{rewards.totalSparks}</Text>
                <Muted>Spark points · level {rewards.level}</Muted>
                <Muted>Tiny 1 · standard 2 · stretch 3</Muted>
              </View>
              <View style={styles.todayScore}>
                <Text style={[styles.todayWins, { color: theme.primary }]}>{winsToday.length}</Text>
                <Muted>wins today</Muted>
                <Text style={[styles.textAction, { color: theme.primary }]}>View Progress →</Text>
              </View>
            </Card>
          </Pressable>
        ) : winsToday.length ? (
          <Muted>{winsToday.length} gentle {winsToday.length === 1 ? 'win' : 'wins'} today</Muted>
        ) : null}

        {spark.settings.minimumViableDay ? (
          <Card style={{ borderColor: theme.success }}>
            <Eyebrow>One-thing day is on</Eyebrow>
            <SectionHeading>Spark is showing only one tiny action.</SectionHeading>
            <Muted>
              You turned on this temporary view. It hides the rest of today’s menu; it does not
              delete habits or record missed actions.
            </Muted>
          </Card>
        ) : null}

        {announcement ? (
          <Card style={{ borderColor: theme.purple }}>
            <Eyebrow>From Spark</Eyebrow>
            <SectionHeading>{announcement.title}</SectionHeading>
            <Body>{announcement.body}</Body>
          </Card>
        ) : null}

        {checkInExpanded ? (
          <Card>
            <View style={styles.summaryHeading}>
              <SectionHeading>Shape today’s menu</SectionHeading>
              {yesterdayCheckIn ? (
                <Pressable accessibilityRole="button" onPress={() => void useYesterday()}>
                  <Text style={[styles.textAction, { color: theme.primary }]}>Same as yesterday</Text>
                </Pressable>
              ) : null}
            </View>
            <Muted>
              Optional: these answers only change which action sizes appear below. They do not
              affect your score or mark anything missed.
            </Muted>
            <CapacityPicker value={capacity} onChange={(value) => void chooseCapacity(value)} />
            <View style={styles.timeArea}>
              <Muted>How much room do you have?</Muted>
              <View style={styles.chips}>
                {timeOptions.map((value) => (
                  <Chip
                    key={value}
                    label={`${value} min`}
                    selected={timeChosen && minutes === value}
                    onPress={() => void chooseMinutes(value)}
                  />
                ))}
                <Chip
                  label="No clock"
                  selected={timeChosen && minutes == null}
                  onPress={() => void chooseMinutes(undefined)}
                />
              </View>
            </View>
            <View style={styles.timeArea}>
              <Muted>What context are you in?</Muted>
              <View style={styles.chips}>
                {contextOptions.map(([value, label]) => (
                  <Chip
                    key={value}
                    label={label}
                    selected={context === value}
                    onPress={() =>
                      void chooseContext(context === value ? undefined : value)
                    }
                  />
                ))}
              </View>
            </View>
          </Card>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit today's capacity, time, and context"
            onPress={() => setCheckInExpanded(true)}
          >
            <Card style={styles.compactCheckIn}>
              <View>
                <Eyebrow>Today’s shape</Eyebrow>
                <Muted>
                  {capacity ?? 'steady'} · {minutes ? `${minutes} min` : 'no clock'}
                  {context ? ` · ${context}` : ''}
                </Muted>
              </View>
              <Ionicons name="create-outline" size={20} color={theme.primary} />
            </Card>
          </Pressable>
        )}

        <Button
          label={
            spark.settings.minimumViableDay
              ? 'Turn off One-thing day'
              : 'Show only one tiny action'
          }
          variant="secondary"
          onPress={() => void toggleOneThingDay()}
        />

        {spark.settings.progressiveHelpEnabled && !spark.settings.simpleMode ? (
          <Button
            label="I’m stuck — help me choose what to do"
            variant="ghost"
            onPress={() => router.push('/help')}
          />
        ) : null}

        <View style={styles.sectionTitle}>
          <View style={styles.sectionTitleText}>
            <SectionHeading>Choose an action</SectionHeading>
            <Muted>Tap Log only when you want to record a win. Nothing becomes overdue.</Muted>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a habit"
            hitSlop={10}
            onPress={() => router.push('/habit/new')}
            style={styles.addHabit}
          >
            <Ionicons name="add-circle" size={34} color={theme.primary} />
          </Pressable>
        </View>

        {eligiblePlan.length > 1 ? (
          <Button
            label={pickedHabitId ? 'Show my menu' : 'Pick one for me'}
            variant="secondary"
            onPress={() => {
              if (pickedHabitId) {
                setPickedHabitId(null);
                return;
              }
              const index = Math.abs([...today].reduce((sum, char) => sum + char.charCodeAt(0), 0)) %
                eligiblePlan.length;
              const picked = eligiblePlan[index]!;
              setPickedHabitId(picked.habit.id);
              setNotice(`Picked because it fits today: ${picked.explanation}`);
            }}
          />
        ) : null}

        {notice ? (
          <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: theme.textMuted }]}>
            {notice}
          </Text>
        ) : null}

        {returnSuggestion ? (
          <Card style={{ borderColor: theme.success }}>
            <Eyebrow>A quiet return</Eyebrow>
            <SectionHeading>{returnSuggestion.habit.title} is not a debt.</SectionHeading>
            <Muted>
              A tiny version helped before. It is here if today is a useful day to return.
            </Muted>
            <Button
              label={`Log tiny: ${
                returnSuggestion.habit.variants.find((variant) => variant.kind === 'tiny')
                  ?.label ?? returnSuggestion.variant.label
              }`}
              variant="secondary"
              onPress={() => {
                const tiny =
                  returnSuggestion.habit.variants.find((variant) => variant.kind === 'tiny') ??
                  returnSuggestion.variant;
                void complete(returnSuggestion.habit.title, tiny, returnSuggestion.habit.id);
              }}
            />
          </Card>
        ) : null}

        {visiblePlan.length ? (
          visiblePlan.map((suggestion) => {
            const tiny =
              suggestion.habit.variants.find((variant) => variant.kind === 'tiny') ??
              suggestion.variant;
            return (
              <HabitCard
                key={suggestion.habit.id}
                suggestion={suggestion}
                saving={savingHabitId === suggestion.habit.id}
                showRewards={spark.settings.showRewards}
                onEdit={() => router.push(`/habit/${suggestion.habit.id}`)}
                onComplete={(variant) =>
                  void complete(suggestion.habit.title, variant, suggestion.habit.id)
                }
                onTiny={() =>
                  void complete(suggestion.habit.title, tiny, suggestion.habit.id)
                }
                onFocus={(focusMinutes) =>
                  startFocus(
                    suggestion.variant.label,
                    focusMinutes || suggestion.variant.targetMinutes,
                    suggestion.habit.id
                  )
                }
                onDefer={(kind) => {
                  void spark.deferHabit(suggestion.habit.id, kind);
                  setNotice(
                    kind === 'tomorrow'
                      ? 'Moved to tomorrow. Nothing was marked missed.'
                      : kind === 'quiet_today'
                        ? 'Quiet for today. Your rhythm is unchanged.'
                        : 'Moved out of the way for now. Nothing was marked missed.'
                  );
                }}
              />
            );
          })
        ) : returnSuggestion ? null : (
          <Card style={styles.enough}>
            <Text style={styles.enoughEmoji}>🌙</Text>
            <SectionHeading>Enough is a valid finish line.</SectionHeading>
            <Muted>
              There is nothing overdue here. You can rest, repeat something because it feels
              good, or add a new Spark another day.
            </Muted>
          </Card>
        )}

        {capacity === 'empty' && (visiblePlan[0] ?? returnSuggestion) ? (
          <Card>
            <Eyebrow>Can’t start?</Eyebrow>
            <SectionHeading>Borrow five seconds of momentum.</SectionHeading>
            <Muted>
              Put your hand on the first object involved. That is the whole step. If momentum
              appears, keep it; if not, you still started.
            </Muted>
            {(() => {
              const suggestion = visiblePlan[0] ?? returnSuggestion!;
              const tiny =
                suggestion.habit.variants.find((variant) => variant.kind === 'tiny') ??
                suggestion.variant;
              return (
                <Button
                  label={`Log tiny: ${tiny.label}`}
                  variant="secondary"
                  onPress={() =>
                    void complete(suggestion.habit.title, tiny, suggestion.habit.id)
                  }
                />
              );
            })()}
          </Card>
        ) : null}

        <Button
          label="Open a routine"
          variant="ghost"
          onPress={() => router.push('/(tabs)/journey')}
          icon={<Ionicons name="list-outline" size={20} color={theme.text} />}
        />
      </Screen>
      <SparkBurst
        visible={Boolean(celebration) && !isQuietNow(spark.settings)}
        title={celebration?.title ?? ''}
        reward={celebration?.reward ?? 0}
        reducedMotion={spark.settings.reducedMotion || isQuietNow(spark.settings)}
        sensoryProfile={isQuietNow(spark.settings) ? 'calm' : spark.settings.sensoryProfile}
        celebrationStyle={spark.entitlement.premium ? spark.settings.celebrationStyle : 'burst'}
        showReward={spark.settings.showRewards && !isQuietNow(spark.settings)}
        tags={celebration?.completion.tags ?? []}
        onToggleTag={(tag) => void toggleTag(tag)}
        onDismiss={() => setCelebration(null)}
      />
      {undoEntry ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityLabel="Win logged. Undo is available."
          style={[styles.undo, { backgroundColor: '#0B1020' }]}
        >
          <Text style={styles.undoText}>Logged. Tiny still counts.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Undo the most recent completion"
            hitSlop={12}
            onPress={() => {
              void spark.undoCompletion(undoEntry.completion.id);
              if (celebration?.completion.id === undoEntry.completion.id) {
                setCelebration(null);
              }
              setUndoEntry(null);
            }}
          >
            <Text style={styles.undoAction}>Undo</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, gap: 3 },
  settings: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scoreCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreDetails: { flex: 1, gap: 1 },
  score: { fontSize: 30, fontWeight: '800' },
  todayScore: { alignItems: 'flex-end' },
  todayWins: { fontSize: 24, fontWeight: '800' },
  timeArea: { gap: 9 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textAction: { fontSize: 13, fontWeight: '800' },
  compactCheckIn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  sectionTitleText: { flex: 1, minWidth: 0, gap: 2 },
  addHabit: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  notice: { fontSize: 13, lineHeight: 19, paddingHorizontal: 4 },
  enough: { alignItems: 'center', paddingVertical: 26 },
  enoughEmoji: { fontSize: 40 },
  undo: {
    position: 'absolute',
    bottom: 84,
    left: 18,
    right: 18,
    borderRadius: 15,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  undoText: { color: '#FFFFFF', fontSize: 14 },
  undoAction: { color: '#FFC857', fontSize: 14, fontWeight: '800' }
});
