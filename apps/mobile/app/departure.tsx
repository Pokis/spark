import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/Chip';
import { FormField } from '../src/components/FormField';
import { Screen } from '../src/components/Screen';
import { Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import { createId } from '../src/lib/id';
import { openCalendarExport } from '../src/services/calendarBridge';
import { useSpark } from '../src/state/SparkProvider';

export default function DepartureScreen() {
  const spark = useSpark();
  const [title, setTitle] = useState('Leave the house');
  const [targetAt, setTargetAt] = useState(() => new Date(Date.now() + 90 * 60_000));
  const [buffer, setBuffer] = useState(15);
  const [routineId, setRoutineId] = useState<string | null>(
    spark.routines.find((routine) => !routine.archivedAt && /leave/i.test(routine.title))?.id ??
      null
  );
  const [showPicker, setShowPicker] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const routine = spark.routines.find((item) => item.id === routineId);
  const routineMinutes = useMemo(
    () => routine?.steps.reduce((total, step) => total + step.estimateMinutes, 0) ?? 0,
    [routine]
  );
  const startAt = new Date(
    targetAt.getTime() - (buffer + routineMinutes) * 60_000
  );

  async function save(status: 'planned' | 'active' = 'planned') {
    const id = savedId ?? createId('departure');
    await spark.saveDeparturePlan({
      id,
      title: title.trim() || 'Departure',
      targetAt: targetAt.toISOString(),
      bufferMinutes: buffer,
      routineId,
      status,
      createdAt: new Date().toISOString(),
      completedAt: null
    });
    setSavedId(id);
    return id;
  }

  async function exportCalendar() {
    try {
      await save();
      await openCalendarExport({
        title: `Spark: ${title.trim() || 'Departure'}`,
        startAt,
        endAt: targetAt,
        notes: [
          `Start winding up at ${startAt.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}.`,
          routine ? `Routine: ${routine.title}.` : '',
          `${buffer}-minute buffer included.`,
          'Created explicitly from Spark. Spark did not read your calendar.'
        ]
          .filter(Boolean)
          .join('\n')
      });
    } catch (error) {
      Alert.alert(
        'Could not open calendar',
        error instanceof Error ? error.message : 'Try again.'
      );
    }
  }

  async function begin() {
    await save('active');
    if (routineId) {
      router.push(`/routine/${routineId}`);
    } else {
      router.push({ pathname: '/(tabs)/focus', params: { title, minutes: '2' } });
    }
  }

  return (
    <Screen>
      <View>
        <Eyebrow>Time-blindness support</Eyebrow>
        <H1>Work backward from “out the door.”</H1>
        <Muted>The buffer is real time, not a penalty. Spark never reads your calendar.</Muted>
      </View>

      <Card>
        <FormField
          label="What are you leaving for?"
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />
        <SectionHeading>
          Leave by{' '}
          {targetAt.toLocaleString([], {
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </SectionHeading>
        <View style={styles.choices}>
          {[30, 60, 90, 120].map((minutes) => (
            <Chip
              key={minutes}
              label={`In ${minutes} min`}
              selected={Math.abs(targetAt.getTime() - Date.now() - minutes * 60_000) < 60_000}
              onPress={() => setTargetAt(new Date(Date.now() + minutes * 60_000))}
            />
          ))}
          <Chip label="Choose time" selected={showPicker} onPress={() => setShowPicker(true)} />
        </View>
        {showPicker ? (
          <DateTimePicker
            value={targetAt}
            mode={Platform.OS === 'ios' ? 'datetime' : 'time'}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_event, value) => {
              if (Platform.OS === 'android') setShowPicker(false);
              if (!value) return;
              const next = new Date(value);
              if (next <= new Date()) next.setDate(next.getDate() + 1);
              setTargetAt(next);
            }}
          />
        ) : null}
      </Card>

      <Card>
        <SectionHeading>Include a forgiving buffer</SectionHeading>
        <View style={styles.choices}>
          {[0, 10, 15, 20, 30].map((minutes) => (
            <Chip
              key={minutes}
              label={`${minutes} min`}
              selected={buffer === minutes}
              onPress={() => setBuffer(minutes)}
            />
          ))}
        </View>
        <Muted>Optional routine</Muted>
        <View style={styles.choices}>
          <Chip label="No routine" selected={!routineId} onPress={() => setRoutineId(null)} />
          {spark.routines
            .filter((item) => !item.archivedAt)
            .map((item) => (
              <Chip
                key={item.id}
                label={`${item.icon} ${item.title}`}
                selected={routineId === item.id}
                onPress={() => setRoutineId(item.id)}
              />
            ))}
        </View>
      </Card>

      <Card>
        <Eyebrow>Your runway</Eyebrow>
        <SectionHeading>
          Begin around{' '}
          {startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </SectionHeading>
        <Muted>
          {routineMinutes} routine minutes + {buffer} buffer minutes. This estimate is allowed to
          be imperfect.
        </Muted>
      </Card>

      <Button label="Start departure runway" onPress={() => void begin()} />
      <Button label="Add this block to my calendar" variant="secondary" onPress={() => void exportCalendar()} />
      <Button
        label="Save without starting"
        variant="ghost"
        onPress={() =>
          void save().then(() => Alert.alert('Saved', 'Your departure plan is stored locally.'))
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
});

