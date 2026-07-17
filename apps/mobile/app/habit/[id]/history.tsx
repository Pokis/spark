import {
  addCalendarDays,
  isDatePaused,
  localDateKey,
  recentDateKeys,
  type Completion,
  type CompletionTag,
  type HabitVariant
} from '@spark/domain';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { Chip } from '../../../src/components/Chip';
import { Screen } from '../../../src/components/Screen';
import { Eyebrow, H1, Muted, SectionHeading } from '../../../src/components/Typography';
import { loadHabitCompletions } from '../../../src/data/database';
import { useSpark } from '../../../src/state/SparkProvider';
import { useTheme } from '../../../src/theme';
import { goBackOr } from '../../../src/lib/navigation';

const tagLabels: Record<CompletionTag, string> = {
  timer_helped: 'Timer helped',
  made_it_tiny: 'Made it tiny',
  body_double: 'Focus companion',
  good_cue: 'Good cue'
};

export default function HabitHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const spark = useSpark();
  const theme = useTheme();
  const habit = spark.habits.find((candidate) => candidate.id === id);
  const [history, setHistory] = useState<Completion[]>([]);
  const [showCorrection, setShowCorrection] = useState(false);
  const today = localDateKey(new Date(), spark.timeZone);
  const days = recentDateKeys(new Date(), spark.timeZone, 28);

  useEffect(() => {
    if (id) void loadHabitCompletions(id, 180).then(setHistory);
  }, [id, spark.completions]);

  if (!habit) {
    return (
      <Screen>
        <H1>Habit not found</H1>
        <Button label="Go back" onPress={() => goBackOr('/(tabs)/journey')} />
      </Screen>
    );
  }

  async function logForgotten(variant: HabitVariant, daysAgo: 0 | 1) {
    const dateKey = addCalendarDays(today, -daysAgo);
    const occurredAt = new Date(`${dateKey}T12:00:00`);
    await spark.completeHabit(habit!, variant, 'history', { occurredAt });
    setShowCorrection(false);
  }

  async function toggleTag(completion: Completion, tag: CompletionTag) {
    const tags = completion.tags ?? [];
    const next = tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
    await spark.setCompletionTags(completion.id, next);
    setHistory((current) =>
      current.map((item) => (item.id === completion.id ? { ...item, tags: next } : item))
    );
  }

  return (
    <Screen>
      <View>
        <Eyebrow>{habit.icon} Habit history</Eyebrow>
        <H1>{habit.title}</H1>
        <Muted>See completed actions, intentional pauses, and patterns across time.</Muted>
      </View>

      <Card>
        <SectionHeading>Last 28 days</SectionHeading>
        <View
          accessible
          accessibilityLabel={`${history.filter((item) => days.includes(item.localDate)).length} completed actions in the last 28 days`}
          style={styles.calendar}
        >
          {days.map((day) => {
            const count = history.filter((item) => item.localDate === day).length;
            const paused = isDatePaused(habit, day);
            return (
              <View
                key={day}
                style={[
                  styles.day,
                  {
                    backgroundColor: count ? `${habit.color}2A` : theme.surfaceAlt,
                    borderColor: count ? habit.color : paused ? theme.purple : theme.border
                  }
                ]}
              >
                <Text style={[styles.dayNumber, { color: theme.text }]}>
                  {Number(day.slice(-2))}
                </Text>
                <Text style={[styles.dayState, { color: count ? habit.color : theme.textMuted }]}>
                  {count ? `✓${count > 1 ? count : ''}` : paused ? 'Ⅱ' : '·'}
                </Text>
              </View>
            );
          })}
        </View>
        <Muted>✓ completed action · Ⅱ planned pause</Muted>
      </Card>

      <Button
        label={showCorrection ? 'Close correction tools' : 'Add a win I forgot to log'}
        variant="secondary"
        onPress={() => setShowCorrection((value) => !value)}
      />
      {showCorrection ? (
        <Card>
          <SectionHeading>Choose what happened</SectionHeading>
          <Muted>This adds a completion to the selected date. It can be removed below.</Muted>
          {([0, 1] as const).map((daysAgo) => (
            <View key={daysAgo} style={styles.correction}>
              <Eyebrow>{daysAgo === 0 ? 'Today' : 'Yesterday'}</Eyebrow>
              <View style={styles.tags}>
                {habit.variants.map((variant) => (
                  <Chip
                    key={`${daysAgo}-${variant.id}`}
                    label={`${variant.kind}: ${variant.label}`}
                    onPress={() => void logForgotten(variant, daysAgo)}
                  />
                ))}
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <SectionHeading>Recent wins</SectionHeading>
      {history.length ? (
        history.map((completion) => {
          const variant = habit.variants.find((item) => item.id === completion.variantId);
          return (
            <Card key={completion.id} style={styles.historyCard}>
              <View style={styles.historyHeading}>
                <View style={styles.historyText}>
                  <Text style={[styles.title, { color: theme.text }]}>
                    {variant?.label ?? completion.variantKind}
                  </Text>
                  <Muted>
                    {new Date(completion.occurredAt).toLocaleString()} · {completion.source}
                  </Muted>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove completion ${variant?.label ?? completion.variantKind}`}
                  onPress={() =>
                    Alert.alert(
                      'Remove this completion?',
                      'This removes the selected completion from your history.',
                      [
                        { text: 'Keep it', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => void spark.undoCompletion(completion.id)
                        }
                      ]
                    )
                  }
                >
                  <Ionicons name="trash-outline" size={20} color={theme.textMuted} />
                </Pressable>
              </View>
              <View style={styles.tags}>
                {(Object.keys(tagLabels) as CompletionTag[]).map((tag) => (
                  <Chip
                    key={tag}
                    label={tagLabels[tag]}
                    selected={completion.tags?.includes(tag)}
                    onPress={() => void toggleTag(completion, tag)}
                  />
                ))}
              </View>
            </Card>
          );
        })
      ) : (
        <Card>
          <SectionHeading>Your first win will appear here.</SectionHeading>
          <Muted>Use “Add a win I forgot to log” for an action you already completed.</Muted>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  calendar: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  day: {
    width: '12.1%',
    minWidth: 38,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayNumber: { fontSize: 11, fontWeight: '700' },
  dayState: { fontSize: 13, fontWeight: '900' },
  correction: { gap: 7 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  historyCard: { gap: 10 },
  historyHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyText: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800' }
});
