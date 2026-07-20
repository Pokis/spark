import {
  addCalendarDays,
  calendarDayDifference,
  localDateKey,
  scheduleLabel,
  type Habit,
  type HabitContext,
  type MomentumCadence,
  type ReminderWindow,
  type ScheduleRule
} from '@spark/domain';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalDraft } from '../hooks/useLocalDraft';
import { createId } from '../lib/id';
import { isValidPreferredTime } from '../services/notifications';
import { useSpark } from '../state/SparkProvider';
import { habitColors, useTheme } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import { Chip } from './Chip';
import { CollapsibleSection } from './CollapsibleSection';
import { FormField } from './FormField';
import { Screen } from './Screen';
import { SettingRow } from './SettingRow';
import { Body, Muted, SectionHeading } from './Typography';

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
const scheduleChoices: { type: ScheduleRule['type']; title: string; detail: string }[] = [
  { type: 'daily', title: 'Every day', detail: 'Available once each day.' },
  { type: 'weekdays', title: 'Certain days', detail: 'Choose exact days of the week.' },
  { type: 'timesPerWeek', title: 'Times each week', detail: 'Flexible days within a rolling week.' },
  { type: 'interval', title: 'Every few days', detail: 'Fixed calendar rhythm, even if completed late.' },
  {
    type: 'afterCompletion',
    title: 'After I complete it',
    detail: 'The next date shifts from when you actually finish.'
  },
  { type: 'anytime', title: 'Whenever I want', detail: 'Always available; no scheduled date.' }
];

type ScheduleType = ScheduleRule['type'];

function variantFor(habit: Habit | undefined, kind: 'tiny' | 'standard' | 'stretch') {
  return habit?.variants.find((variant) => variant.kind === kind);
}

function singleVariant(habit: Habit | undefined) {
  return variantFor(habit, 'standard') ?? habit?.variants[0];
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
  const existingUsesSizes = (habit?.variants.length ?? 0) > 1;
  const [title, setTitle] = useState(habit?.title ?? initialTitle ?? '');
  const [scheduleType, setScheduleType] = useState<ScheduleType | null>(
    habit?.schedule.type ?? null
  );
  const [days, setDays] = useState<number[]>(
    habit?.schedule.type === 'weekdays' ? habit.schedule.days : [1, 2, 3, 4, 5]
  );
  const [weeklyCount, setWeeklyCount] = useState(
    String(habit?.schedule.type === 'timesPerWeek' ? habit.schedule.count : 3)
  );
  const [intervalDays, setIntervalDays] = useState(
    String(
      habit?.schedule.type === 'interval' || habit?.schedule.type === 'afterCompletion'
        ? habit.schedule.everyDays
        : 2
    )
  );
  const [useSizes, setUseSizes] = useState(existingUsesSizes);
  const [tiny, setTiny] = useState(variantFor(habit, 'tiny')?.label ?? 'Do the smallest step');
  const [standard, setStandard] = useState(
    singleVariant(habit)?.label ?? initialTitle ?? habit?.title ?? ''
  );
  const [stretch, setStretch] = useState(variantFor(habit, 'stretch')?.label ?? 'Do a little extra');
  const [tinyMinutes, setTinyMinutes] = useState(String(variantFor(habit, 'tiny')?.targetMinutes ?? 1));
  const [standardMinutes, setStandardMinutes] = useState(String(singleVariant(habit)?.targetMinutes ?? 1));
  const [stretchMinutes, setStretchMinutes] = useState(String(variantFor(habit, 'stretch')?.targetMinutes ?? 15));
  const [icon, setIcon] = useState(habit?.icon ?? '✨');
  const [color, setColor] = useState(habit?.color ?? habitColors[0]);
  const [reason, setReason] = useState(habit?.reason ?? '');
  const [cue, setCue] = useState(habit?.cue ?? '');
  const [firstStep, setFirstStep] = useState(habit?.friction?.firstStep ?? '');
  const [fallback, setFallback] = useState(habit?.friction?.fallback ?? '');
  const [selectedContexts, setSelectedContexts] = useState<HabitContext[]>(habit?.contexts ?? ['anywhere']);
  const [priority, setPriority] = useState<1 | 2 | 3>(habit?.priority ?? 2);
  const [reminderEnabled, setReminderEnabled] = useState(habit?.reminderEnabled ?? false);
  const [reminderWindow, setReminderWindow] = useState<ReminderWindow>(habit?.reminderWindow ?? 'exact');
  const [preferredTime, setPreferredTime] = useState(habit?.preferredTime ?? '09:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [momentumEnabled, setMomentumEnabled] = useState(habit?.momentum?.enabled ?? false);
  const [momentumCadence, setMomentumCadence] = useState<MomentumCadence>(habit?.momentum?.cadence ?? 'daily');
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  const clearDraft = useLocalDraft(
    `habit-${habit?.id ?? 'new'}`,
    {
      title, scheduleType, days, weeklyCount, intervalDays, useSizes, tiny, standard,
      stretch, tinyMinutes, standardMinutes, stretchMinutes, icon, color, reason, cue,
      firstStep, fallback, selectedContexts, priority, reminderEnabled, reminderWindow,
      preferredTime, momentumEnabled, momentumCadence, advanced
    },
    (draft) => {
      setTitle(draft.title ?? '');
      setScheduleType(draft.scheduleType ?? null);
      setDays(draft.days ?? [1, 2, 3, 4, 5]);
      setWeeklyCount(draft.weeklyCount ?? '3');
      setIntervalDays(draft.intervalDays ?? '2');
      setUseSizes(draft.useSizes ?? false);
      setTiny(draft.tiny ?? 'Do the smallest step');
      setStandard(draft.standard ?? '');
      setStretch(draft.stretch ?? 'Do a little extra');
      setTinyMinutes(draft.tinyMinutes ?? '1');
      setStandardMinutes(draft.standardMinutes ?? '1');
      setStretchMinutes(draft.stretchMinutes ?? '15');
      setIcon(draft.icon ?? '✨');
      setColor(draft.color ?? habitColors[0]);
      setReason(draft.reason ?? '');
      setCue(draft.cue ?? '');
      setFirstStep(draft.firstStep ?? '');
      setFallback(draft.fallback ?? '');
      setSelectedContexts(draft.selectedContexts ?? ['anywhere']);
      setPriority(draft.priority ?? 2);
      setReminderEnabled(draft.reminderEnabled ?? false);
      setReminderWindow(draft.reminderWindow ?? 'exact');
      setPreferredTime(draft.preferredTime ?? '09:00');
      setMomentumEnabled(draft.momentumEnabled ?? false);
      setMomentumCadence(draft.momentumCadence ?? 'daily');
      setAdvanced(draft.advanced ?? false);
    }
  );

  function buildSchedule(): ScheduleRule {
    const today = localDateKey(new Date(), spark.timeZone);
    if (scheduleType === 'weekdays') return { type: 'weekdays', days };
    if (scheduleType === 'timesPerWeek') {
      return { type: 'timesPerWeek', count: Math.max(1, Math.min(7, Number(weeklyCount) || 1)) };
    }
    if (scheduleType === 'interval' || scheduleType === 'afterCompletion') {
      const existingAnchor = habit?.schedule.type === scheduleType ? habit.schedule.anchorDate : today;
      return {
        type: scheduleType,
        everyDays: Math.max(1, Math.min(365, Number(intervalDays) || 1)),
        anchorDate: existingAnchor
      };
    }
    if (scheduleType === 'anytime') return { type: 'anytime' };
    return { type: 'daily' };
  }

  function variants(): Habit['variants'] {
    if (!useSizes) {
      return [{
        id: singleVariant(habit)?.id ?? createId('variant'),
        kind: 'standard',
        label: title.trim(),
        targetMinutes: Math.max(1, Number(standardMinutes) || 1),
        reward: 1
      }];
    }
    return [
      {
        id: variantFor(habit, 'tiny')?.id ?? createId('variant'), kind: 'tiny',
        label: tiny.trim(), targetMinutes: Math.max(1, Number(tinyMinutes) || 1), reward: 1
      },
      {
        id: variantFor(habit, 'standard')?.id ?? createId('variant'), kind: 'standard',
        label: standard.trim() || title.trim(), targetMinutes: Math.max(1, Number(standardMinutes) || 5), reward: 2
      },
      {
        id: variantFor(habit, 'stretch')?.id ?? createId('variant'), kind: 'stretch',
        label: stretch.trim(), targetMinutes: Math.max(1, Number(stretchMinutes) || 15), reward: 3
      }
    ];
  }

  async function save() {
    if (!title.trim()) {
      Alert.alert('Name the habit', 'Add a short name, such as Take vitamins.');
      return;
    }
    if (!scheduleType) {
      Alert.alert('Choose how often', 'Select when this habit should appear.');
      return;
    }
    if (scheduleType === 'weekdays' && days.length === 0) {
      Alert.alert('Choose at least one day', 'Pick the days when this habit should appear.');
      return;
    }
    if (useSizes && (!tiny.trim() || !stretch.trim())) {
      Alert.alert('Check the action sizes', 'Give the smaller and larger options a short label.');
      return;
    }
    if (reminderEnabled && reminderWindow === 'exact' && !isValidPreferredTime(preferredTime)) {
      Alert.alert('Check the reminder time', 'Choose a valid time, such as 09:30.');
      return;
    }
    setSaving(true);
    const habitId = habit?.id ?? createId('habit');
    const momentumAnchor = habit?.momentum?.anchorDate ?? localDateKey(new Date(), spark.timeZone);
    const cadenceDays = momentumCadence === 'everyOtherDay' ? 2 : 1;
    const next: Habit = {
      id: habitId,
      title: title.trim(),
      reason: reason.trim() || undefined,
      cue: cue.trim() || undefined,
      friction: {
        firstStep: firstStep.trim() || undefined,
        fallback: fallback.trim() || undefined
      },
      color,
      icon,
      variants: variants(),
      schedule: buildSchedule(),
      preferredTime,
      reminderEnabled,
      reminderWindow,
      priority,
      contexts: selectedContexts.length ? selectedContexts : ['anywhere'],
      createdAt: habit?.createdAt ?? new Date().toISOString(),
      pausedAt: habit?.pausedAt ?? null,
      pausedUntil: habit?.pausedUntil ?? null,
      pauseHistory: habit?.pauseHistory ?? [],
      momentum: {
        enabled: momentumEnabled,
        cadence: momentumCadence,
        anchorDate: momentumAnchor,
        protections: (habit?.momentum?.protections ?? []).filter((protection) => {
          const elapsed = calendarDayDifference(momentumAnchor, protection.windowStart);
          return elapsed >= 0 && elapsed % cadenceDays === 0;
        })
      },
      archivedAt: habit?.archivedAt ?? null,
      sortOrder: habit?.sortOrder ?? spark.habits.length
    };
    try {
      await spark.saveHabit(next);
      if (useSizes && !spark.settings.actionSizesEnabled) {
        await spark.updateSetting('actionSizesEnabled', true);
      }
      if (momentumEnabled && !spark.settings.streaksEnabled) {
        await spark.updateSetting('streaksEnabled', true);
      }
      await clearDraft();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(day: number) {
    setDays((current) => current.includes(day)
      ? current.filter((value) => value !== day)
      : [...current, day]);
  }

  function toggleContext(context: HabitContext) {
    setSelectedContexts((current) => current.includes(context)
      ? current.filter((value) => value !== context)
      : [...current, context]);
  }

  function preferredTimeDate(): Date {
    const value = new Date();
    const [hour, minute] = preferredTime.split(':').map(Number);
    value.setHours(Number.isInteger(hour) ? hour! : 9, Number.isInteger(minute) ? minute! : 0, 0, 0);
    return value;
  }

  return (
    <Screen testID="habit-editor">
      <View style={styles.intro}>
        <SectionHeading>{habit ? 'Edit habit' : 'New habit'}</SectionHeading>
        <Muted>Only the name and frequency are required.</Muted>
      </View>

      <Card>
        <FormField
          label="Habit name"
          placeholder="Take vitamins"
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            if (!habit && (!standard || standard === title)) setStandard(value);
          }}
          maxLength={80}
          autoFocus={!habit}
          testID="habit-title"
        />
      </Card>

      <Card>
        <SectionHeading>How often?</SectionHeading>
        <Muted>This decides when the habit appears on Today and in reminders.</Muted>
        <View style={styles.scheduleList}>
          {scheduleChoices.map((choice) => (
            <Pressable
              key={choice.type}
              accessibilityRole="radio"
              accessibilityLabel={choice.title}
              accessibilityState={{ checked: scheduleType === choice.type }}
              onPress={() => setScheduleType(choice.type)}
              style={[
                styles.scheduleChoice,
                {
                  borderColor: scheduleType === choice.type ? theme.primary : theme.border,
                  backgroundColor: scheduleType === choice.type ? `${theme.primary}12` : theme.surface
                }
              ]}
            >
              <View style={styles.scheduleText}>
                <Text style={[styles.scheduleTitle, { color: theme.text }]}>{choice.title}</Text>
                <Muted>{choice.detail}</Muted>
              </View>
              <Text style={[styles.radio, { color: scheduleType === choice.type ? theme.primary : theme.textMuted }]}>
                {scheduleType === choice.type ? '●' : '○'}
              </Text>
            </Pressable>
          ))}
        </View>
        {scheduleType === 'weekdays' ? (
          <View style={styles.choices}>
            {weekdayLabels.map((label, index) => (
              <Chip key={label} label={label} selected={days.includes(index)} onPress={() => toggleDay(index)} />
            ))}
          </View>
        ) : null}
        {scheduleType === 'timesPerWeek' ? (
          <FormField label="How many times per week?" value={weeklyCount} onChangeText={setWeeklyCount} keyboardType="number-pad" maxLength={1} />
        ) : null}
        {scheduleType === 'interval' || scheduleType === 'afterCompletion' ? (
          <FormField
            label={scheduleType === 'afterCompletion' ? 'Days after completion' : 'Repeat every number of days'}
            hint={scheduleType === 'afterCompletion' ? 'Example: complete on Friday with 3 days selected → next due Monday.' : 'This follows fixed calendar dates.'}
            value={intervalDays}
            onChangeText={setIntervalDays}
            keyboardType="number-pad"
            maxLength={3}
          />
        ) : null}
        {habit && scheduleType ? <Muted>Current choice: {scheduleLabel(buildSchedule())}</Muted> : null}
      </Card>

      <CollapsibleSection
        title="Optional details"
        summary="Reminder, action sizes, appearance, and starting help"
        expanded={advanced}
        onExpandedChange={setAdvanced}
      >
        <SettingRow
          title="Use different action sizes"
          description="Off is best for simple yes-or-no habits such as taking vitamins."
          value={useSizes}
          onValueChange={setUseSizes}
        />
        {useSizes ? (
          <Card style={styles.innerCard}>
            <SectionHeading>Action sizes</SectionHeading>
            <Muted>Each option counts as completing this habit.</Muted>
            <View style={styles.variantRow}>
              <View style={styles.variantInput}><FormField label="Small" value={tiny} onChangeText={setTiny} maxLength={100} /></View>
              <View style={styles.minutesInput}><FormField label="Min" value={tinyMinutes} onChangeText={setTinyMinutes} keyboardType="number-pad" maxLength={3} /></View>
            </View>
            <View style={styles.variantRow}>
              <View style={styles.variantInput}><FormField label="Regular" value={standard} onChangeText={setStandard} maxLength={100} /></View>
              <View style={styles.minutesInput}><FormField label="Min" value={standardMinutes} onChangeText={setStandardMinutes} keyboardType="number-pad" maxLength={3} /></View>
            </View>
            <View style={styles.variantRow}>
              <View style={styles.variantInput}><FormField label="Larger" value={stretch} onChangeText={setStretch} maxLength={100} /></View>
              <View style={styles.minutesInput}><FormField label="Min" value={stretchMinutes} onChangeText={setStretchMinutes} keyboardType="number-pad" maxLength={3} /></View>
            </View>
          </Card>
        ) : null}

        <SettingRow
          title="Reminder"
          description="A private notification scheduled on this device."
          value={reminderEnabled}
          onValueChange={setReminderEnabled}
        />
        {reminderEnabled ? (
          <Card style={styles.innerCard}>
            <View style={styles.choices}>
              {([['exact', 'Exact time'], ['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening']] as const).map(([value, label]) => (
                <Chip key={value} label={label} selected={reminderWindow === value} onPress={() => setReminderWindow(value)} />
              ))}
            </View>
            {reminderWindow === 'exact' ? (
              <>
                <Button label={`Choose time · ${preferredTime}`} variant="secondary" onPress={() => setShowTimePicker(true)} />
                {showTimePicker ? (
                  <DateTimePicker
                    value={preferredTimeDate()}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_event, selected) => {
                      if (Platform.OS === 'android') setShowTimePicker(false);
                      if (selected) setPreferredTime(`${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
                    }}
                  />
                ) : null}
              </>
            ) : null}
          </Card>
        ) : null}

        <Card style={styles.innerCard}>
          <SectionHeading>Appearance</SectionHeading>
          <View style={styles.choices}>
            {iconChoices.map((value) => <Chip key={value} label={value} selected={icon === value} onPress={() => setIcon(value)} />)}
          </View>
          <View style={styles.colors}>
            {habitColors.map((value, index) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={`${colorNames[index]} color`}
                accessibilityState={{ checked: color === value }}
                onPress={() => setColor(value)}
                style={[styles.color, { backgroundColor: value, borderColor: color === value ? theme.text : 'transparent' }]}
              >
                <Text style={styles.colorCheck}>{color === value ? '✓' : ''}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={styles.innerCard}>
          <SectionHeading>Helpful context</SectionHeading>
          <FormField label="Why this matters" placeholder="Optional" value={reason} onChangeText={setReason} maxLength={240} multiline />
          <FormField label="Cue" placeholder="After breakfast…" value={cue} onChangeText={setCue} maxLength={160} />
          {spark.settings.adaptiveSuggestionsEnabled ? (
            <>
              <FormField label="Smallest physical first step" placeholder="Open the bottle" value={firstStep} onChangeText={setFirstStep} maxLength={240} />
              <FormField label="Fallback when stuck" placeholder="Put it somewhere visible" value={fallback} onChangeText={setFallback} maxLength={240} />
              <Muted>Where can this happen?</Muted>
              <View style={styles.choices}>
                {contexts.map((item) => <Chip key={item.value} label={item.label} selected={selectedContexts.includes(item.value)} onPress={() => toggleContext(item.value)} />)}
              </View>
              <Muted>Importance</Muted>
              <View style={styles.choices}>
                {([1, 2, 3] as const).map((value) => <Chip key={value} label={value === 1 ? 'Normal' : value === 2 ? 'Helpful' : 'High'} selected={priority === value} onPress={() => setPriority(value)} />)}
              </View>
            </>
          ) : null}
        </Card>

        {spark.settings.streaksEnabled ? (
          <Card style={styles.innerCard}>
            <SettingRow
              title="Reward streak"
              description="Optional celebration for consecutive periods."
              value={momentumEnabled}
              onValueChange={setMomentumEnabled}
            />
            {momentumEnabled ? (
              <View style={styles.choices}>
                <Chip label="Every day" selected={momentumCadence === 'daily'} onPress={() => setMomentumCadence('daily')} />
                <Chip label="Every other day" selected={momentumCadence === 'everyOtherDay'} onPress={() => setMomentumCadence('everyOtherDay')} />
              </View>
            ) : null}
          </Card>
        ) : null}
      </CollapsibleSection>

      <Button label={habit ? 'Save changes' : 'Create habit'} loading={saving} onPress={() => void save()} testID="save-habit" />

      {habit && onHistory ? <Button label="View completion history" variant="secondary" onPress={onHistory} /> : null}

      {habit ? (
        <CollapsibleSection title="Pause or archive" summary="Temporarily hide this habit or move it out of the active list">
          <Body>Pause keeps the habit and its history while removing it from Today.</Body>
          <Button label="Pause for 1 day" variant="secondary" onPress={() => void spark.pauseHabit(habit, addCalendarDays(localDateKey(new Date(), spark.timeZone), 1)).then(onSaved)} />
          <Button label="Pause for 1 week" variant="secondary" onPress={() => void spark.pauseHabit(habit, addCalendarDays(localDateKey(new Date(), spark.timeZone), 7)).then(onSaved)} />
          {habit.pausedUntil ? <Button label="Resume now" variant="ghost" onPress={() => void spark.pauseHabit(habit, null).then(onSaved)} /> : null}
          {onArchive ? (
            <Button
              label="Archive habit"
              variant="danger"
              onPress={() => Alert.alert('Archive this habit?', 'Its completion history will stay available.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Archive', style: 'destructive', onPress: onArchive }
              ])}
            />
          ) : null}
        </CollapsibleSection>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 4 },
  scheduleList: { gap: 8 },
  scheduleChoice: { minHeight: 64, borderWidth: 1.5, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduleText: { flex: 1, gap: 2 },
  scheduleTitle: { fontSize: 16, fontWeight: '800' },
  radio: { fontSize: 23 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  innerCard: { padding: 12 },
  variantRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  variantInput: { flex: 1 },
  minutesInput: { width: 72 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  color: { width: 44, height: 44, borderRadius: 15, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  colorCheck: { color: '#FFFFFF', fontWeight: '900' }
});
