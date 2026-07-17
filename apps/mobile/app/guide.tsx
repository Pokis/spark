import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { Body, Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import { useSpark } from '../src/state/SparkProvider';
import { useTheme } from '../src/theme';

const terms = [
  {
    icon: 'repeat-outline' as const,
    title: 'Habit',
    body: 'Something you would like to repeat, such as drinking water or opening a difficult document.'
  },
  {
    icon: 'resize-outline' as const,
    title: 'Action size',
    body: 'A tiny, standard, or stretch version of a habit. Pick the size that fits the day you actually have.'
  },
  {
    icon: 'checkmark-circle-outline' as const,
    title: 'Win',
    body: 'An action you completed and deliberately logged. Blank days and deferred actions are not failures.'
  },
  {
    icon: 'sparkles-outline' as const,
    title: 'Spark points',
    body: 'Optional, predictable progress points: tiny earns 1, standard earns 2, and stretch earns 3. They never expire or buy anything.'
  },
  {
    icon: 'flame-outline' as const,
    title: 'Momentum streak',
    body: 'An optional per-habit chain of completed daily or two-day windows. Flex passes and planned delays can preserve continuity without adding fake wins; your best and ordinary progress are never erased.'
  }
];

export default function GuideScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const activeHabits = spark.habits.filter((habit) => !habit.archivedAt);
  const starterCount = activeHabits.filter((habit) => habit.id.startsWith('starter_')).length;

  return (
    <Screen testID="guide-screen">
      <View>
        <Eyebrow>Quick guide</Eyebrow>
        <H1>How Spark works</H1>
        <Body>
          Spark is the app. It turns habits into smaller actions and remembers the actions you
          choose to log—without a missed-day score.
        </Body>
      </View>

      <Card style={{ borderColor: theme.primary }}>
        <Eyebrow>Your current picture</Eyebrow>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: theme.text }]}>{activeHabits.length}</Text>
            <Muted>active habits</Muted>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: theme.text }]}>
              {spark.completionTotals.totalWins}
            </Text>
            <Muted>logged wins</Muted>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: theme.text }]}>
              {spark.completionTotals.totalSparks}
            </Text>
            <Muted>Spark points</Muted>
          </View>
        </View>
        {starterCount ? (
          <Muted>
            {starterCount} {starterCount === 1 ? 'habit is' : 'habits are'} editable examples
            included by Spark. Tap a habit in Progress to edit or archive it.
          </Muted>
        ) : null}
        <Button
          label="Review my progress and habits"
          variant="secondary"
          onPress={() => router.push('/(tabs)/journey')}
        />
        <Button
          label="Browse feature tutorials"
          variant="ghost"
          onPress={() => router.push('/tutorials')}
        />
      </Card>

      <View style={styles.termList}>
        {terms.map((term) => (
          <Card key={term.title}>
            <View style={styles.termHeading}>
              <View style={[styles.icon, { backgroundColor: theme.surfaceAlt }]}>
                <Ionicons name={term.icon} size={23} color={theme.primary} />
              </View>
              <SectionHeading>{term.title}</SectionHeading>
            </View>
            <Body>{term.body}</Body>
          </Card>
        ))}
      </View>

      <Card>
        <SectionHeading>What happens when you tap</SectionHeading>
        <Muted>
          1. The energy and time check-in only changes which actions Spark suggests. It is
          optional.
        </Muted>
        <Muted>
          2. Tapping Log records that action immediately as a win and adds its fixed point value.
        </Muted>
        <Muted>
          3. Later moves an action out of the way. One-thing day temporarily shows only one tiny
          action. Neither records a failure.
        </Muted>
      </Card>

      <Button label="Go to Today" onPress={() => router.push('/(tabs)')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryNumber: { fontSize: 27, fontWeight: '800' },
  termList: { gap: 10 },
  termHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
