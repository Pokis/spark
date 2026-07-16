import type {
  Habit,
  HabitContext,
  ReminderWindow,
  HabitVariantKind,
  ScheduleRule
} from '@spark/domain';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
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
import { isValidPreferredTime } from '../services/notifications';
import { useLocalDraft } from '../hooks/useLocalDraft';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const colorNames = ['Coral', 'Teal', 'Purple', 'Blue', 'Gold', 'Green'];
const iconChoices = ['✨', '💧', '🧠', '🌿', '📚', '🏃', '🧹', '💊', '🫶', '🎨'];
const contexts: { value: HabitContext; label: string }[] = [
  { value: 'anywhere', label: 'Anywhere' },
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'outside', label: 'Outside' },
  { value: 'phone', label: 'Phone' }
];
const starterTemplates = [
  {
    title: 'Read something',
    tiny: 'Read one sentence',
    standard: 'Read for 5 minutes',
    stretch: 'Read for 15 minutes',
    icon: '📚'
  },
  {
    title: 'Move my body',
    tiny: 'Put on movement shoes',
    standard: 'Move for 5 minutes',
    stretch: 'Move for 15 minutes',
    icon: '🏃'
  },
  {
    title: 'Reset my space',
    tiny: 'Put away one thing',
    standard: 'Clear one small surface',
    stretch: 'Do a 15-minute reset',
    icon: '✨'
  }
] as const;

type ScheduleType = ScheduleRule['type'];

function variantByKind(habit: Habit | undefined, kind: HabitVariantKind) {
  return habit?.variants.find((variant) => variant.kind === kind);
}

export function HabitEditor({
  habit,
  initialTitle,
  onSaved,
  onArchive,
  onHistory
}: {
  habit?: Habit;
  initialTitle?: string;
  onSaved(): void;
  onArchive?(): void;
  onHistory?(): void;
}) {
  const spark = useSpark();
  const theme = useTheme();
  const [title, setTitle] = useState(habit?.title ?? initialTitle ?? '');
  const [reason, setReason] = useState(habit?.reason ?? '');
  const [cue, setCue] = useState(habit?.cue ?? '');
  const [environment, setEnvironment] = useState(habit?.friction?.environment ?? '');
  const [materials, setMaterials] = useState(habit?.friction?.materials ?? '');
  const [firstStep, setFirstStep] = useState(habit?.friction?.firstStep ?? '');
  const [obstacle, setObstacle] = useState(habit?.friction?.obstacle ?? '');
  const [fallback, setFallback] = useState(habit?.friction?.fallback ?? '');
  const [futureNote, setFutureNote] = useState(habit?.friction?.futureNote ?? '');
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
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(habit?.reminderEnabled ?? false);
  const [reminderWindow, setReminderWindow] = useState<ReminderWindow>(
    habit?.reminderWindow ?? 'exact'
  );
  const [priority, setPriority] = useState<1 | 2 | 3>(habit?.priority ?? 2);
  const [selectedContexts, setSelectedContexts] = useState<HabitContext[]>(
    habit?.contexts ?? ['anywhere']
  );
  const [saving, setSaving] = useState(false);
  const [advanced, setAdvanced] = useState(Boolean(habit));
  const clearDraft = useLocalDraft(
    `habit-${habit?.id ?? 'new'}`,
    {
      title,
      reason,
      cue,
      environment,
      materials,
      firstStep,
      obstacle,
      fallback,
      futureNote,
      icon,
      color,
      tiny,
      standard,
      stretch,
      tinyMinutes,
      standardMinutes,
      stretchMinutes,
      scheduleType,
      days,
      weeklyCount,
      intervalDays,
      preferredTime,
      reminderEnabled,
      reminderWindow,
      priority,
      selectedContexts,
      advanced
    },
    (draft) => {
      setTitle(draft.title);
      setReason(draft.reason);
      setCue(draft.cue);
      setEnvironment(draft.environment ?? '');
      setMaterials(draft.materials ?? '');
      setFirstStep(draft.firstStep ?? '');
      setObstacle(draft.obstacle ?? '');
      setFallback(draft.fallback ?? '');
      setFutureNote(draft.futureNote ?? '');
      setIcon(draft.icon);
      setColor(draft.color);
      setTiny(draft.tiny);
      setStandard(draft.standard);
      setStretch(draft.stretch);
      setTinyMinutes(draft.tinyMinutes);
      setStandardMinutes(draft.standardMinutes);
      setStretchMinutes(draft.stretchMinutes);
      setScheduleType(draft.scheduleType);
      setDays(draft.days);
      setWeeklyCount(draft.weeklyCount);
      setIntervalDays(draft.intervalDays);
      setPreferredTime(draft.preferredTime);
      setReminderEnabled(draft.reminderEnabled);
      setReminderWindow(draft.reminderWindow);
      setPriority(draft.priority);
      setSelectedContexts(draft.selectedContexts);
      setAdvanced(draft.advanced);
    }
  );

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
    if (reminderEnabled && reminderWindow === 'exact' && !isValidPreferredTime(preferredTime)) {
      Alert.alert(
        'Check the reminder time',
        'Use a 24-hour time from 00:00 through 23:59, for example 09:30.'
      );
      return;
    }
    setSaving(true);
    const habitId = habit?.id ?? createId('habit');
    const next: Habit = {
      id: habitId,
      title: title.trim(),
      reason: reason.trim() || undefined,
      cue: cue.trim() || undefined,
      friction: {
        environment: environment.trim() || undefined,
        materials: materials.trim() || undefined,
        firstStep: firstStep.trim() || undefined,
        obstacle: obstacle.trim() || undefined,
        fallback: fallback.trim() || undefined,
        futureNote: futureNote.trim() || undefined
      },
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
      reminderWindow,
      priority,
      contexts: selectedContexts.length ? selectedContexts : ['anywhere'],
      createdAt: habit?.createdAt ?? new Date().toISOString(),
      pausedAt: habit?.pausedAt ?? null,
      pausedUntil: habit?.pausedUntil ?? null,
      pauseHistory: habit?.pauseHistory ?? [],
      archivedAt: habit?.archivedAt ?? null,
      sortOrder: habit?.sortOrder ?? spark.habits.length
    };
    try {
      await spark.saveHabit(next);
      await clearDraft();
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

  function applyTemplate(template: (typeof starterTemplates)[number]) {
    setTitle(template.title);
    setTiny(template.tiny);
    setStandard(template.standard);
    setStretch(template.stretch);
    setIcon(template.icon);
  }

  function suggestedTiny(value: string): string {
    const lower = value.toLowerCase();
    if (lower.includes('read')) return 'Read one sentence';
    if (lower.includes('walk') || lower.includes('move') || lower.includes('exercise')) {
      return 'Put on movement shoes';
    }
    if (lower.includes('clean') || lower.includes('tidy') || lower.includes('reset')) {
      return 'Put away one thing';
    }
    if (lower.includes('write')) return 'Write one sentence';
    return value.trim() ? `Touch the first step for ${value.trim()}` : 'Touch the first step';
  }

  function preferredTimeDate(): Date {
    const value = new Date();
    const [hour, minute] = preferredTime.split(':').map(Number);
    value.setHours(
      Number.isInteger(hour) ? hour! : 9,
      Number.isInteger(minute) ? minute! : 0,
      0,
      0
    );
    return value;
  }

  return (
    <Screen>
      <Card>
        <SectionHeading>Make the first step visible</SectionHeading>
        {!habit ? (
          <>
            <Muted>Choose a starter or name your own. Every detail remains editable.</Muted>
            <View style={styles.choices}>
              {starterTemplates.map((template) => (
                <Chip
                  key={template.title}
                  label={`${template.icon} ${template.title}`}
                  selected={title === template.title}
                  onPress={() => applyTemplate(template)}
                />
              ))}
            </View>
          </>
        ) : null}
        <FormField
          label="Habit name"
          placeholder="e.g. Read something"
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            if (!habit && (!standard || standard === title)) setStandard(value);
            if (!habit && (tiny === 'Touch the first step' || tiny.startsWith('Touch the first step for '))) {
              setTiny(suggestedTiny(value));
            }
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

      <Button
        label={advanced ? 'Hide fine-tuning' : 'Fine-tune sizes, schedule, and reminders'}
        variant="secondary"
        onPress={() => setAdvanced((value) => !value)}
      />

      {advanced ? (
        <>
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
          {habitColors.map((value, index) => (
            <Text
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`Choose ${colorNames[index]} color`}
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
        <SectionHeading>Friction toolkit</SectionHeading>
        <Muted>
          Optional prompts for making the action easier before motivation is required. Spark
          stores these locally and never turns them into a score.
        </Muted>
        <FormField
          label="Environment setup"
          hint="What can already be open, visible, charged, or placed nearby?"
          placeholder="Put the book on the pillow"
          value={environment}
          onChangeText={setEnvironment}
          maxLength={240}
        />
        <FormField
          label="Materials to gather"
          placeholder="Shoes, water, keys…"
          value={materials}
          onChangeText={setMaterials}
          maxLength={240}
        />
        <FormField
          label="Literal first physical step"
          placeholder="Open the document"
          value={firstStep}
          onChangeText={setFirstStep}
          maxLength={240}
        />
        <FormField
          label="Likely obstacle"
          placeholder="I may not know where to begin"
          value={obstacle}
          onChangeText={setObstacle}
          maxLength={240}
        />
        <FormField
          label="Fallback if that happens"
          placeholder="Read only the first heading"
          value={fallback}
          onChangeText={setFallback}
          maxLength={240}
        />
        <FormField
          label="Note to future me"
          placeholder="Last time, music made this easier"
          value={futureNote}
          onChangeText={setFutureNote}
          maxLength={400}
          multiline
        />
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
          <View style={styles.timePicker}>
            <Muted>Choose a forgiving window or an exact local time.</Muted>
            <View style={styles.choices}>
              {(
                [
                  ['exact', 'Exact time'],
                  ['morning', 'Morning'],
                  ['afternoon', 'Afternoon'],
                  ['evening', 'Evening']
                ] as const
              ).map(([value, label]) => (
                <Chip
                  key={value}
                  label={label}
                  selected={reminderWindow === value}
                  onPress={() => setReminderWindow(value)}
                />
              ))}
            </View>
            {reminderWindow === 'exact' ? (
              <>
                <Muted>Preferred time: {preferredTime}</Muted>
                <Button
                  label="Choose reminder time"
                  variant="secondary"
                  onPress={() => setShowTimePicker(true)}
                />
                {showTimePicker ? (
                  <DateTimePicker
                    value={preferredTimeDate()}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_event, selected) => {
                      if (Platform.OS === 'android') setShowTimePicker(false);
                      if (!selected) return;
                      setPreferredTime(
                        `${String(selected.getHours()).padStart(2, '0')}:${String(
                          selected.getMinutes()
                        ).padStart(2, '0')}`
                      );
                    }}
                  />
                ) : null}
              </>
            ) : (
              <Muted>
                Spark will place the invitation gently within the {reminderWindow} window.
              </Muted>
            )}
            {reminderWindow === 'exact' && showTimePicker && Platform.OS === 'ios' ? (
              <Button
                label="Use this time"
                variant="ghost"
                onPress={() => setShowTimePicker(false)}
              />
            ) : null}
            <Button
              label="Preview this reminder"
              variant="ghost"
              onPress={() =>
                Alert.alert(
                  `${icon} A small Spark?`,
                  `${tiny}\n\nTiming: ${
                    reminderWindow === 'exact' ? preferredTime : reminderWindow
                  }\nReminder feedback: silent sound, one gentle device vibration\nCompletion feedback: ${
                    spark.settings.sensoryProfile
                  }, ${
                    spark.settings.hapticsEnabled ? 'haptic enabled' : 'haptic muted'
                  }\nActions: Log tiny win · Later · Quiet today`
                )
              }
            />
          </View>
        ) : null}
      </Card>

        </>
      ) : (
        <Card>
          <Muted>
            Spark will start with a 1-minute tiny version, a 5-minute standard version, a
            15-minute stretch, and a flexible daily rhythm. Open fine-tuning whenever you want
            different details.
          </Muted>
        </Card>
      )}

      {habit && onHistory ? (
        <Card>
          <SectionHeading>History and corrections</SectionHeading>
          <Body>Review recent wins and pauses, add optional tags, or log something you forgot.</Body>
          <Button label="Open habit history" variant="secondary" onPress={onHistory} />
        </Card>
      ) : null}

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
  timePicker: { gap: 8 },
  pauseActions: { gap: 8 }
});
