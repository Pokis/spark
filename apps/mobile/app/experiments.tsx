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
      Alert.alert('Already trying this', 'Finish or stop the current experiment first.');
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
        <Eyebrow>Local self-knowledge</Eyebrow>
        <H1>Try one gentle change.</H1>
        <Muted>
          Spark compares a short before-and-during window neutrally. This is not an engagement
          A/B system, and nothing leaves the device.
        </Muted>
      </View>

      <TutorialPrompt
        id="experiments"
        title="See a neutral one-week example first"
        body="This short tutorial explains what Spark changes, what it compares, and why this is different from an engagement experiment."
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
            <Eyebrow>{ready ? 'Ready to review' : 'Experiment in progress'}</Eyebrow>
            <SectionHeading>{habit?.title ?? 'Archived habit'}</SectionHeading>
            <Muted>
              {experiment.kind === 'tiny_week'
                ? 'Tiny version is presented first for one week.'
                : 'A gentle afternoon reminder window is used for one week.'}
            </Muted>
            <Muted>{comparison.summary}</Muted>
            {experiment.note ? <Muted>Your note: {experiment.note}</Muted> : null}
            <Button
              label={ready ? 'Finish and keep this comparison' : 'Finish early'}
              variant="secondary"
              onPress={() => void finish(experiment)}
            />
            <Button
              label="Stop without a conclusion"
              variant="ghost"
              onPress={() => void finish(experiment, true)}
            />
          </Card>
        );
      })}

      <Card>
        <SectionHeading>New one-week experiment</SectionHeading>
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
          hint="Optional. Spark will not judge whether the experiment worked."
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
