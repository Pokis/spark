import type { HabitContext } from '@spark/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/Chip';
import { FormField } from '../src/components/FormField';
import { Screen } from '../src/components/Screen';
import { Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import { createId } from '../src/lib/id';
import { mondayKey } from '../src/lib/weeklyPlanning';
import { useSpark } from '../src/state/SparkProvider';

const contexts: { value: HabitContext; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'outside', label: 'Outside' },
  { value: 'phone', label: 'Phone' },
  { value: 'anywhere', label: 'Anywhere' }
];

export default function WeeklyResetScreen() {
  const spark = useSpark();
  const weekStart = mondayKey(new Date(), spark.timeZone);
  const existing = spark.weeklyPlans.find((plan) => plan.weekStart === weekStart);
  const activeHabits = spark.habits.filter((habit) => !habit.archivedAt);
  const [selected, setSelected] = useState<string[]>(existing?.selectedHabitIds ?? []);
  const [reflection, setReflection] = useState(existing?.reflection ?? '');
  const [context, setContext] = useState<HabitContext | null>(
    existing?.tomorrowContext ?? null
  );
  const [tinyHabitId, setTinyHabitId] = useState<string | null>(
    existing?.tomorrowTinyHabitId ?? null
  );
  const [saving, setSaving] = useState(false);

  function toggleHabit(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) {
        Alert.alert('Keep the week small', 'Choose up to three habits. The others are not failures.');
        return current;
      }
      return [...current, id];
    });
  }

  async function save() {
    setSaving(true);
    try {
      await spark.saveWeeklyPlan({
        id: existing?.id ?? createId('week'),
        weekStart,
        selectedHabitIds: selected,
        reflection: reflection.trim(),
        tomorrowContext: context,
        tomorrowTinyHabitId: tinyHabitId,
        // Saving a fresh reflection also refreshes the "tomorrow" anchor, even
        // when this week's plan already exists.
        createdAt: new Date().toISOString()
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View>
        <Eyebrow>Gentle weekly reset</Eyebrow>
        <H1>Choose what deserves visibility.</H1>
        <Muted>
          This is planning, not a report card. Blank days and paused habits do not need an excuse.
        </Muted>
      </View>

      <Card>
        <SectionHeading>What helped or got in the way?</SectionHeading>
        <FormField
          label="Optional reflection"
          placeholder="A short note to future me…"
          value={reflection}
          onChangeText={setReflection}
          multiline
          maxLength={1200}
        />
      </Card>

      <Card>
        <SectionHeading>Keep up to three habits visible</SectionHeading>
        <Muted>Selected: {selected.length}/3</Muted>
        <View style={styles.choices}>
          {activeHabits.map((habit) => (
            <Chip
              key={habit.id}
              label={`${habit.icon} ${habit.title}`}
              selected={selected.includes(habit.id)}
              onPress={() => toggleHabit(habit.id)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeading>Make tomorrow easier</SectionHeading>
        <Muted>Likely context</Muted>
        <View style={styles.choices}>
          {contexts.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={context === item.value}
              onPress={() => setContext(context === item.value ? null : item.value)}
            />
          ))}
        </View>
        <Muted>One tiny action worth seeing first</Muted>
        <View style={styles.choices}>
          {activeHabits
            .filter((habit) => selected.length === 0 || selected.includes(habit.id))
            .map((habit) => (
              <Chip
                key={habit.id}
                label={
                  habit.variants.find((variant) => variant.kind === 'tiny')?.label ??
                  habit.title
                }
                selected={tinyHabitId === habit.id}
                onPress={() => setTinyHabitId(tinyHabitId === habit.id ? null : habit.id)}
              />
            ))}
        </View>
      </Card>

      <Button label="Save this gentle plan" loading={saving} onPress={() => void save()} />
      <Button
        label="Manage pauses and habits"
        variant="ghost"
        onPress={() => router.push('/(tabs)/journey')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
});
