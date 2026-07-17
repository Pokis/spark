import { addCalendarDays, localDateKey } from '@spark/domain';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/Chip';
import { FormField } from '../src/components/FormField';
import { Screen } from '../src/components/Screen';
import { TutorialPrompt } from '../src/components/TutorialPrompt';
import { Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import type { PersonalExperiment } from '../src/data/models';
import { compareExperiment } from '../src/lib/experiments';
import { createId } from '../src/lib/id';
import { useSpark } from '../src/state/SparkProvider';

export default function ExperimentsScreen() {
  const spark = useSpark();
  const habits = spark.habits.filter((habit) => !habit.archivedAt);
  const [habitId, setHabitId] = useState(habits[0]?.id ?? '');
  const [kind, setKind] = useState<PersonalExperiment['kind']>('tiny_week');
  const [note, setNote] = useState('');
  const active = spark.personalExperiments.filter((item) => item.status === 'active');

  async function startExperiment() {
    if (!habitId) return;
    if (active.some((item) => item.habitId === habitId && item.kind === kind)) {
      Alert.alert('Already trying this', 'Finish or stop the current one-week try first.');
      return;
    }
    const now = new Date();
    const today = localDateKey(now, spark.timeZone);
    const ends = new Date(now.getTime() + 7 * 86_400_000);
    await spark.savePersonalExperiment({
      id: createId('experiment'),
      kind,
      habitId,
      startedAt: now.toISOString(),
      endsAt: ends.toISOString(),
      status: 'active',
      baselineStart: addCalendarDays(today, -7),
      baselineEnd: addCalendarDays(today, -1),
      note: note.trim()
    });
    setNote('');
  }

  async function finish(experiment: PersonalExperiment, stopped = false) {
    await spark.savePersonalExperiment({
      ...experiment,
      status: stopped ? 'stopped' : 'complete'
    });
  }

  return (
    <Screen>
      <View>
        <Eyebrow>Learn what helps you</Eyebrow>
        <H1>Try a change for one week.</H1>
        <Muted>
          Choose one small change. After a week, Spark shows a simple before-and-after count.
          Only you decide whether it helped, and everything stays on this device.
        </Muted>
      </View>

      <TutorialPrompt
        id="experiments"
        title="See how a one-week try works"
        body="This short guide explains what changes, what Spark counts, and how you stay in control."
      />

      {active.map((experiment) => {
        const habit = spark.habits.find((item) => item.id === experiment.habitId);
        const comparison = compareExperiment(
          experiment,
          spark.completions,
          spark.timeZone
        );
        const ready = Date.parse(experiment.endsAt) <= Date.now();
        return (
          <Card key={experiment.id}>
            <Eyebrow>{ready ? 'Ready to review' : 'One-week try in progress'}</Eyebrow>
            <SectionHeading>{habit?.title ?? 'Archived habit'}</SectionHeading>
            <Muted>
              {experiment.kind === 'tiny_week'
                ? 'Tiny version is presented first for one week.'
                : 'An afternoon reminder window is active for one week.'}
            </Muted>
            <Muted>{comparison.summary}</Muted>
            {experiment.note ? <Muted>Your note: {experiment.note}</Muted> : null}
            <Button
              label={ready ? 'Finish and keep this comparison' : 'Finish early'}
              variant="secondary"
              onPress={() => void finish(experiment)}
            />
            <Button
              label="Stop this one-week try"
              variant="ghost"
              onPress={() => void finish(experiment, true)}
            />
          </Card>
        );
      })}

      <Card>
        <SectionHeading>Start a new one-week try</SectionHeading>
        <View style={styles.choices}>
          <Chip
            label="Try the tiny version"
            selected={kind === 'tiny_week'}
            onPress={() => setKind('tiny_week')}
          />
          <Chip
            label="Try an afternoon reminder"
            selected={kind === 'afternoon_reminder'}
            onPress={() => setKind('afternoon_reminder')}
          />
        </View>
        <Muted>Choose one habit</Muted>
        <View style={styles.choices}>
          {habits.map((habit) => (
            <Chip
              key={habit.id}
              label={`${habit.icon} ${habit.title}`}
              selected={habitId === habit.id}
              onPress={() => setHabitId(habit.id)}
            />
          ))}
        </View>
        <FormField
          label="What do you want to notice?"
          hint="Optional. Spark will show the counts, but you decide whether the change helped."
          placeholder="Maybe afternoons are less rushed…"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={500}
        />
        {kind === 'afternoon_reminder' && !spark.settings.notificationsEnabled ? (
          <Muted>
            Local notifications are currently off. You can still save the experiment, but its
            reminder will not appear until notifications are enabled in Settings.
          </Muted>
        ) : null}
        <Button
          label="Start for one week"
          disabled={!habitId}
          onPress={() => void startExperiment()}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
});
