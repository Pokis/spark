import {
  buildTodayPlan,
  localDateKey,
  rewardSummary,
  type Capacity,
  type Completion,
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
import { Body, Eyebrow, H1, Muted, SectionHeading } from '../../src/components/Typography';
import { friendlyDate } from '../../src/lib/date';
import { useSpark } from '../../src/state/SparkProvider';
import { useTheme } from '../../src/theme';

const timeOptions = [2, 5, 10, 20];

export default function TodayScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const today = localDateKey(new Date(), spark.timeZone);
  const checkIn = spark.dailyCheckIns.find((item) => item.localDate === today);
  const [capacity, setCapacity] = useState<Capacity | null>(checkIn?.capacity ?? null);
  const [minutes, setMinutes] = useState<number | undefined>(
    checkIn?.availableMinutes ?? undefined
  );
  const [celebration, setCelebration] = useState<{
    title: string;
    reward: number;
    completion: Completion;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const rewards = rewardSummary(spark.completions);

  const plan = useMemo(
    () =>
      buildTodayPlan({
        habits: spark.habits,
        completions: spark.completions,
        now: new Date(),
        timeZone: spark.timeZone,
        capacity: capacity ?? 'steady',
        availableMinutes: minutes,
        limit: 5
      }),
    [capacity, minutes, spark.completions, spark.habits, spark.timeZone]
  );
  const winsToday = spark.completions.filter((item) => item.localDate === today);

  async function chooseCapacity(value: Capacity) {
    setCapacity(value);
    await spark.setCheckIn(value, minutes ?? null);
  }

  async function chooseMinutes(value: number) {
    setMinutes(value);
    await spark.setCheckIn(capacity ?? 'steady', value);
  }

  async function complete(
    title: string,
    variant: HabitVariant,
    habitId: string
  ): Promise<void> {
    const habit = spark.habits.find((candidate) => candidate.id === habitId);
    if (!habit) return;
    const completion = await spark.completeHabit(habit, variant);
    setCelebration({ title, reward: completion.reward, completion });
  }

  const announcement = spark.remoteConfig.announcements.find((item) => item.enabled);

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
              {spark.settings.displayName
                ? `Hi ${spark.settings.displayName}`
                : 'What feels possible?'}
            </H1>
            {spark.entitlement.premium ? <Eyebrow>✦ Spark supporter</Eyebrow> : null}
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

        <Card style={[styles.scoreCard, { backgroundColor: theme.surfaceAlt }]}>
          <View>
            <Text style={[styles.score, { color: theme.text }]}>{rewards.totalSparks}</Text>
            <Muted>total sparks · level {rewards.level}</Muted>
          </View>
          <View style={styles.todayScore}>
            <Text style={[styles.todayWins, { color: theme.primary }]}>{winsToday.length}</Text>
            <Muted>wins today</Muted>
          </View>
        </Card>

        {announcement ? (
          <Card style={{ borderColor: theme.purple }}>
            <Eyebrow>From Spark</Eyebrow>
            <SectionHeading>{announcement.title}</SectionHeading>
            <Body>{announcement.body}</Body>
          </Card>
        ) : null}

        <CapacityPicker value={capacity} onChange={(value) => void chooseCapacity(value)} />
        <View style={styles.timeArea}>
          <Muted>How much room do you have?</Muted>
          <View style={styles.chips}>
            {timeOptions.map((value) => (
              <Chip
                key={value}
                label={`${value} min`}
                selected={minutes === value}
                onPress={() => void chooseMinutes(value)}
              />
            ))}
            <Chip
              label="No clock"
              selected={minutes == null}
              onPress={() => {
                setMinutes(undefined);
                void spark.setCheckIn(capacity ?? 'steady', null);
              }}
            />
          </View>
        </View>

        <View style={styles.sectionTitle}>
          <View>
            <SectionHeading>Your next Sparks</SectionHeading>
            <Muted>Invitations, not obligations.</Muted>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a habit"
            onPress={() => router.push('/habit/new')}
          >
            <Ionicons name="add-circle" size={34} color={theme.primary} />
          </Pressable>
        </View>

        {plan.length ? (
          plan.map((suggestion) => (
            <HabitCard
              key={suggestion.habit.id}
              suggestion={suggestion}
              onEdit={() => router.push(`/habit/${suggestion.habit.id}`)}
              onComplete={(variant) =>
                void complete(suggestion.habit.title, variant, suggestion.habit.id)
              }
            />
          ))
        ) : (
          <Card style={styles.enough}>
            <Text style={styles.enoughEmoji}>🌙</Text>
            <SectionHeading>Enough is a valid finish line.</SectionHeading>
            <Muted>
              There is nothing overdue here. You can rest, repeat something because it feels
              good, or add a new Spark another day.
            </Muted>
          </Card>
        )}

        {plan[0] && capacity === 'empty' ? (
          <Card>
            <Eyebrow>Can’t start?</Eyebrow>
            <SectionHeading>Borrow five seconds of momentum.</SectionHeading>
            <Muted>
              Put your hand on the first object involved. That is the whole step. If momentum
              appears, keep it; if not, you still started.
            </Muted>
            <Button
              label={`Do: ${plan[0].habit.variants[0]?.label ?? plan[0].habit.title}`}
              variant="secondary"
              onPress={() => {
                const variant = plan[0]?.habit.variants[0];
                if (variant)
                  void complete(plan[0].habit.title, variant, plan[0].habit.id);
              }}
            />
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
        visible={Boolean(celebration)}
        title={celebration?.title ?? ''}
        reward={celebration?.reward ?? 0}
        reducedMotion={spark.settings.reducedMotion}
        onDismiss={() => setCelebration(null)}
      />
      {celebration ? (
        <View style={[styles.undo, { backgroundColor: '#0B1020' }]}>
          <Text style={styles.undoText}>Logged. Tiny still counts.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void spark.undoCompletion(celebration.completion.id);
              setCelebration(null);
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
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  score: { fontSize: 30, fontWeight: '800' },
  todayScore: { alignItems: 'flex-end' },
  todayWins: { fontSize: 24, fontWeight: '800' },
  timeArea: { gap: 9 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
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
