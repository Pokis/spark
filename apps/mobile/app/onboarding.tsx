import { localDateKey, type Habit, type ScheduleRule } from '@spark/domain';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/Chip';
import { FormField } from '../src/components/FormField';
import { Screen } from '../src/components/Screen';
import { Body, Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import { createId } from '../src/lib/id';
import { useSpark } from '../src/state/SparkProvider';
import { habitColors, useTheme } from '../src/theme';

const scheduleChoices: { type: ScheduleRule['type']; label: string }[] = [
  { type: 'daily', label: 'Every day' },
  { type: 'weekdays', label: 'Certain days' },
  { type: 'timesPerWeek', label: 'Times each week' },
  { type: 'afterCompletion', label: 'After I complete it' },
  { type: 'anytime', label: 'Whenever' }
];
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function OnboardingScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [title, setTitle] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleRule['type'] | null>(null);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [count, setCount] = useState('3');
  const [intervalDays, setIntervalDays] = useState('2');

  function schedule(): ScheduleRule {
    const today = localDateKey(new Date(), spark.timeZone);
    if (scheduleType === 'weekdays') return { type: 'weekdays', days };
    if (scheduleType === 'timesPerWeek') return { type: 'timesPerWeek', count: Math.max(1, Math.min(7, Number(count) || 1)) };
    if (scheduleType === 'afterCompletion') return { type: 'afterCompletion', everyDays: Math.max(1, Math.min(365, Number(intervalDays) || 1)), anchorDate: today };
    if (scheduleType === 'anytime') return { type: 'anytime' };
    return { type: 'daily' };
  }

  async function finish(withHabit: boolean) {
    if (withHabit) {
      if (!title.trim()) {
        Alert.alert('Name your habit', 'Use a short action such as Take vitamins.');
        return;
      }
      if (!scheduleType) {
        Alert.alert('Choose how often', 'Select when this habit should appear.');
        return;
      }
      if (scheduleType === 'weekdays' && days.length === 0) {
        Alert.alert('Choose a day', 'Select at least one day of the week.');
        return;
      }
      const habitId = createId('habit');
      const habit: Habit = {
        id: habitId,
        title: title.trim(),
        color: habitColors[0],
        icon: '✨',
        variants: [{
          id: createId('variant'),
          kind: 'standard',
          label: title.trim(),
          targetMinutes: 1,
          reward: 1
        }],
        schedule: schedule(),
        reminderEnabled: false,
        priority: 2,
        contexts: ['anywhere'],
        createdAt: new Date().toISOString(),
        pausedAt: null,
        pausedUntil: null,
        pauseHistory: [],
        archivedAt: null,
        sortOrder: spark.habits.length
      };
      await spark.saveHabit(habit);
    }
    await spark.updateSetting('onboardingComplete', true);
    router.replace('/(tabs)');
  }

  return (
    <Screen contentStyle={styles.screen} testID="onboarding-screen">
      <View style={styles.top}>
        <Image source={require('../assets/spark-icon-v2.png')} accessibilityIgnoresInvertColors style={styles.logo} />
        <View style={styles.dots}>
          {[0, 1].map((index) => <View key={index} style={[styles.dot, { backgroundColor: index === page ? theme.primary : theme.border }]} />)}
        </View>
      </View>

      {page === 0 ? (
        <Card style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: `${theme.primary}18` }]}>
            <Ionicons name="calendar-outline" size={38} color={theme.primary} />
          </View>
          <Eyebrow>Welcome to Spark</Eyebrow>
          <H1>A habit list and calendar.</H1>
          <Body>Create the habits you care about, choose how often each should happen, and tap Done when you complete one.</Body>
          <View style={[styles.promise, { backgroundColor: theme.surfaceAlt }]}>
            <Muted>Extra tools such as focus timers, routines, points, and streaks start hidden. Enable only the ones you want.</Muted>
          </View>
        </Card>
      ) : (
        <Card style={styles.hero}>
          <Eyebrow>Your first habit</Eyebrow>
          <H1>What do you want to track?</H1>
          <FormField label="Habit name" placeholder="Take vitamins" value={title} onChangeText={setTitle} maxLength={80} autoFocus testID="onboarding-first-habit" />
          <SectionHeading>How often?</SectionHeading>
          <View style={styles.scheduleList}>
            {scheduleChoices.map((choice) => (
              <Pressable
                key={choice.type}
                accessibilityRole="radio"
                accessibilityLabel={choice.label}
                accessibilityState={{ checked: scheduleType === choice.type }}
                onPress={() => setScheduleType(choice.type)}
                style={[styles.scheduleChoice, { borderColor: scheduleType === choice.type ? theme.primary : theme.border }]}
              >
                <Text style={[styles.scheduleLabel, { color: theme.text }]}>{choice.label}</Text>
                <Text style={{ color: scheduleType === choice.type ? theme.primary : theme.textMuted }}>{scheduleType === choice.type ? '●' : '○'}</Text>
              </Pressable>
            ))}
          </View>
          {scheduleType === 'weekdays' ? (
            <View style={styles.chips}>{weekdays.map((label, index) => <Chip key={label} label={label} selected={days.includes(index)} onPress={() => setDays((current) => current.includes(index) ? current.filter((day) => day !== index) : [...current, index])} />)}</View>
          ) : null}
          {scheduleType === 'timesPerWeek' ? <FormField label="Times per week" value={count} onChangeText={setCount} keyboardType="number-pad" maxLength={1} /> : null}
          {scheduleType === 'afterCompletion' ? <FormField label="Days after completion" hint="The next date moves when you finish early or late." value={intervalDays} onChangeText={setIntervalDays} keyboardType="number-pad" maxLength={3} /> : null}
        </Card>
      )}

      <View style={styles.actions}>
        {page === 0 ? (
          <Button label="Continue" onPress={() => setPage(1)} testID="onboarding-continue" />
        ) : (
          <>
            <Button label="Create habit" onPress={() => void finish(true)} testID="onboarding-continue" />
            <Button label="Set up later" variant="ghost" onPress={() => void finish(false)} />
            <Button label="Back" variant="ghost" onPress={() => setPage(0)} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'space-between', minHeight: '100%', paddingBottom: 28 },
  top: { alignItems: 'center', gap: 16 },
  logo: { width: 70, height: 70, borderRadius: 22 },
  dots: { flexDirection: 'row', gap: 7 },
  dot: { width: 34, height: 7, borderRadius: 99 },
  hero: { padding: 20, gap: 14 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  promise: { borderRadius: 14, padding: 13 },
  scheduleList: { gap: 7 },
  scheduleChoice: { minHeight: 48, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduleLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { gap: 8 }
});
