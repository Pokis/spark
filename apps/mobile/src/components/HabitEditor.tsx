import type {
  Habit,
  HabitContext,
  HabitVariantKind,
  ScheduleRule
} from '@spark/domain';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { addCalendarDays, localDateKey } from '@spark/domain';
import { useSpark } from '../state/SparkProvider';
import { habitColors, useTheme } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import { Chip } from './Chip';
import { FormField } from './FormField';
import { Screen } from './Screen';
import { SettingRow } from './SettingRow';
import { Body, Muted, SectionHeading } from './Typography';
import { createId } from '../lib/id';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const iconChoices = ['✨', '💧', '🧠', '🌿', '📚', '🏃', '🧹', '💊', '🫶', '🎨'];
const contexts: { value: HabitContext; label: string }[] = [
  { value: 'anywhere', label: 'Anywhere' },
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'outside', label: 'Outside' },
  { value: 'phone', label: 'Phone' }
];

type ScheduleType = ScheduleRule['type'];

function variantByKind(habit: Habit | undefined, kind: HabitVariantKind) {
  return habit?.variants.find((variant) => variant.kind === kind);
}

export function HabitEditor({
  habit,
  initialTitle,
  onSaved,
  onArchive
}: {
  habit?: Habit;
  initialTitle?: string;
  onSaved(): void;
  onArchive?(): void;
}) {
  const spark = useSpark();
  const theme = useTheme();
  const [title, setTitle] = useState(habit?.title ?? initialTitle ?? '');
  const [reason, setReason] = useState(habit?.reason ?? '');
  const [cue, setCue] = useState(habit?.cue ?? '');
  const [icon, setIcon] = useState(habit?.icon ?? '✨');
  const [color, setColor] = useState(habit?.color ?? habitColors[0]);
  const [tiny, setTiny] = useState(variantByKind(habit, 'tiny')?.label ?? 'Touch the first step');
  const [standard, setStandard] = useState(
    variantByKind(habit, 'standard')?.label ?? initialTitle ?? ''
  );
  const [stretch, setStretch] = useState(
    variantByKind(habit, 'stretch')?.label ?? 'Do a little extra'
  );
  const [tinyMinutes, setTinyMinutes] = useState(
    String(variantByKind(habit, 'tiny')?.targetMinutes ?? 1)
  );
  const [standardMinutes, setStandardMinutes] = useState(
    String(variantByKind(habit, 'standard')?.targetMinutes ?? 5)
  );
  const [stretchMinutes, setStretchMinutes] = useState(
    String(variantByKind(habit, 'stretch')?.targetMinutes ?? 15)
  );
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    habit?.schedule.type ?? 'daily'
  );
  const [days, setDays] = useState<number[]>(
    habit?.schedule.type === 'weekdays' ? habit.schedule.days : [1, 2, 3, 4, 5]
  );
  const [weeklyCount, setWeeklyCount] = useState(
    String(habit?.schedule.type === 'timesPerWeek' ? habit.schedule.count : 3)
  );
  const [intervalDays, setIntervalDays] = useState(
    String(habit?.schedule.type === 'interval' ? habit.schedule.everyDays : 2)
  );
  const [preferredTime, setPreferredTime] = useState(habit?.preferredTime ?? '09:00');
  const [reminderEnabled, setReminderEnabled] = useState(habit?.reminderEnabled ?? false);
  const [priority, setPriority] = useState<1 | 2 | 3>(habit?.priority ?? 2);
  const [selectedContexts, setSelectedContexts] = useState<HabitContext[]>(
    habit?.contexts ?? ['anywhere']
  );
  const [saving, setSaving] = useState(false);

  function schedule(): ScheduleRule {
    if (scheduleType === 'weekdays') return { type: 'weekdays', days };
    if (scheduleType === 'timesPerWeek') {
      return { type: 'timesPerWeek', count: Math.max(1, Math.min(7, Number(weeklyCount) || 1)) };
    }
    if (scheduleType === 'interval') {
      return {
        type: 'interval',
        everyDays: Math.max(1, Math.min(365, Number(intervalDays) || 1)),
        anchorDate: localDateKey(new Date(), spark.timeZone)
      };
    }
    if (scheduleType === 'anytime') return { type: 'anytime' };
    return { type: 'daily' };
  }

  async function save() {
    if (!title.trim() || !tiny.trim() || !standard.trim() || !stretch.trim()) {
      Alert.alert('A few words are missing', 'Give the habit and all three versions a label.');
      return;
    }
    if (scheduleType === 'weekdays' && days.length === 0) {
      Alert.alert('Choose a day', 'Select at least one day for this rhythm.');
      return;
    }
    setSaving(true);
    const habitId = habit?.id ?? createId('habit');
    const next: Habit = {
      id: habitId,
      title: title.trim(),
      reason: reason.trim() || undefined,
      cue: cue.trim() || undefined,
      color,
      icon,
      variants: [
        {
          id: variantByKind(habit, 'tiny')?.id ?? createId('variant'),
          kind: 'tiny',
          label: tiny.trim(),
          targetMinutes: Math.max(1, Number(tinyMinutes) || 1),
          reward: 1
        },
        {
          id: variantByKind(habit, 'standard')?.id ?? createId('variant'),
          kind: 'standard',
          label: standard.trim(),
          targetMinutes: Math.max(1, Number(standardMinutes) || 5),
          reward: 2
        },
        {
          id: variantByKind(habit, 'stretch')?.id ?? createId('variant'),
          kind: 'stretch',
          label: stretch.trim(),
          targetMinutes: Math.max(1, Number(stretchMinutes) || 15),
          reward: 3
        }
      ],
      schedule: schedule(),
      preferredTime,
      reminderEnabled,
      priority,
      contexts: selectedContexts.length ? selectedContexts : ['anywhere'],
      createdAt: habit?.createdAt ?? new Date().toISOString(),
      pausedUntil: habit?.pausedUntil ?? null,
      archivedAt: habit?.archivedAt ?? null,
      sortOrder: habit?.sortOrder ?? spark.habits.length
    };
    try {
      await spark.saveHabit(next);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(day: number) {
    setDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day]
    );
  }

  function toggleContext(context: HabitContext) {
    setSelectedContexts((current) =>
      current.includes(context)
        ? current.filter((value) => value !== context)
        : [...current, context]
    );
  }

  return (
    <Screen>
      <Card>
        <SectionHeading>Make the first step visible</SectionHeading>
        <FormField
          label="Habit name"
          placeholder="e.g. Read something"
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            if (!habit && !standard) setStandard(value);
          }}
          maxLength={80}
          autoFocus={!habit}
          testID="habit-title"
        />
        <FormField
          label="Why might this help?"
          hint="Optional. A compassionate reason is more useful than a demand."
          placeholder="I want to feel…"
          value={reason}
          onChangeText={setReason}
          maxLength={240}
          multiline
        />
        <FormField
          label="Visible cue"
          hint="Optional. Try: After I…, I will…"
          placeholder="After I put down my mug…"
          value={cue}
          onChangeText={setCue}
          maxLength={160}
        />
      </Card>

      <Card>
        <SectionHeading>Pick a look</SectionHeading>
        <View style={styles.choices}>
          {iconChoices.map((value) => (
            <Chip
              key={value}
              label={value}
              selected={icon === value}
              onPress={() => setIcon(value)}
            />
          ))}
        </View>
        <View style={styles.colors}>
          {habitColors.map((value) => (
            <Text
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`Choose color ${value}`}
              accessibilityState={{ selected: color === value }}
              onPress={() => setColor(value)}
              style={[
                styles.color,
                {
                  backgroundColor: value,
                  borderColor: color === value ? theme.text : 'transparent'
                }
              ]}
            >
              {color === value ? '✓' : ''}
            </Text>
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeading>Three valid sizes</SectionHeading>
        <Muted>Each version is a win. Points are fixed and transparent—not randomized.</Muted>
        <View style={styles.variantRow}>
          <View style={styles.variantInput}>
            <FormField label="Tiny version" value={tiny} onChangeText={setTiny} maxLength={100} />
          </View>
          <View style={styles.minutesInput}>
            <FormField
              label="Min"
              value={tinyMinutes}
              onChangeText={setTinyMinutes}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        </View>
        <View style={styles.variantRow}>
          <View style={styles.variantInput}>
            <FormField
              label="Standard version"
              value={standard}
              onChangeText={setStandard}
              maxLength={100}
            />
          </View>
          <View style={styles.minutesInput}>
            <FormField
              label="Min"
              value={standardMinutes}
              onChangeText={setStandardMinutes}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        </View>
        <View style={styles.variantRow}>
          <View style={styles.variantInput}>
            <FormField
              label="Stretch version"
              value={stretch}
              onChangeText={setStretch}
              maxLength={100}
            />
          </View>
          <View style={styles.minutesInput}>
            <FormField
              label="Min"
              value={stretchMinutes}
              onChangeText={setStretchMinutes}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        </View>
      </Card>

      <Card>
        <SectionHeading>Flexible rhythm</SectionHeading>
        <View style={styles.choices}>
          {(
            [
              ['daily', 'Daily'],
              ['weekdays', 'Certain days'],
              ['timesPerWeek', 'Times/week'],
              ['interval', 'Every few days'],
              ['anytime', 'Anytime']
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={scheduleType === value}
              onPress={() => setScheduleType(value)}
            />
          ))}
        </View>
        {scheduleType === 'weekdays' ? (
          <View style={styles.choices}>
            {weekdayLabels.map((label, index) => (
              <Chip
                key={label}
                label={label}
                selected={days.includes(index)}
                onPress={() => toggleDay(index)}
              />
            ))}
          </View>
        ) : null}
        {scheduleType === 'timesPerWeek' ? (
          <FormField
            label="Times per rolling week"
            value={weeklyCount}
            onChangeText={setWeeklyCount}
            keyboardType="number-pad"
            maxLength={1}
          />
        ) : null}
        {scheduleType === 'interval' ? (
          <FormField
            label="Every number of days"
            value={intervalDays}
            onChangeText={setIntervalDays}
            keyboardType="number-pad"
            maxLength={3}
          />
        ) : null}
      </Card>

      <Card>
        <SectionHeading>Make it easier to notice</SectionHeading>
        <View style={styles.choices}>
          {contexts.map((context) => (
            <Chip
              key={context.value}
              label={context.label}
              selected={selectedContexts.includes(context.value)}
              onPress={() => toggleContext(context.value)}
            />
          ))}
        </View>
        <Muted>Importance helps Spark choose among several possible actions.</Muted>
        <View style={styles.choices}>
          {([1, 2, 3] as const).map((value) => (
            <Chip
              key={value}
              label={value === 1 ? 'Nice' : value === 2 ? 'Helpful' : 'Important'}
              selected={priority === value}
              onPress={() => setPriority(value)}
            />
          ))}
        </View>
        <SettingRow
          title="Gentle local reminder"
          description="Scheduled by this device. No cloud required."
          value={reminderEnabled}
          onValueChange={setReminderEnabled}
        />
        {reminderEnabled ? (
          <FormField
            label="Preferred time"
            hint="24-hour time, for example 09:30"
            value={preferredTime}
            onChangeText={setPreferredTime}
            maxLength={5}
            keyboardType="numbers-and-punctuation"
          />
        ) : null}
      </Card>

      {habit ? (
        <Card>
          <SectionHeading>Need breathing room?</SectionHeading>
          <Body>Pausing is planning, not failure. Existing progress stays exactly where it is.</Body>
          <View style={styles.pauseActions}>
            <Button
              label="Pause 1 day"
              variant="secondary"
              onPress={() =>
                void spark
                  .pauseHabit(
                    habit,
                    addCalendarDays(localDateKey(new Date(), spark.timeZone), 1)
                  )
                  .then(onSaved)
              }
            />
            <Button
              label="Pause 1 week"
              variant="secondary"
              onPress={() =>
                void spark
                  .pauseHabit(
                    habit,
                    addCalendarDays(localDateKey(new Date(), spark.timeZone), 7)
                  )
                  .then(onSaved)
              }
            />
            {habit.pausedUntil ? (
              <Button
                label="Resume now"
                variant="ghost"
                onPress={() => void spark.pauseHabit(habit, null).then(onSaved)}
              />
            ) : null}
          </View>
        </Card>
      ) : null}

      <Button
        label={habit ? 'Save changes' : 'Create Spark'}
        loading={saving}
        onPress={() => void save()}
        testID="save-habit"
      />
      {habit && onArchive ? (
        <Button
          label="Archive habit"
          variant="danger"
          onPress={() =>
            Alert.alert(
              'Archive this habit?',
              'Its history stays in your Journey, but it will stop appearing Today.',
              [
                { text: 'Keep it', style: 'cancel' },
                { text: 'Archive', style: 'destructive', onPress: onArchive }
              ]
            )
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  color: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 3,
    color: '#FFFFFF',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: '900'
  },
  variantRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  variantInput: { flex: 1 },
  minutesInput: { width: 72 },
  pauseActions: { gap: 8 }
});
