import type { Routine, RoutineStep } from '@spark/domain';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalDraft } from '../hooks/useLocalDraft';
import { createId } from '../lib/id';
import { useSpark } from '../state/SparkProvider';
import { habitColors, useTheme } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import { Chip } from './Chip';
import { FormField } from './FormField';
import { Screen } from './Screen';
import { Muted, SectionHeading } from './Typography';

const icons = ['🚪', '☀️', '🌙', '💼', '🧹', '🛁', '🍳', '🧳'];
const colorNames = ['Coral', 'Teal', 'Purple', 'Blue', 'Gold', 'Green'];
const templates = [
  {
    title: 'Leave the house',
    icon: '🚪',
    steps: [
      ['Shoes and outer layer', 'Touch the shoes', 2],
      ['Keys, phone, wallet', 'Touch the keys', 1],
      ['Step outside', 'Open the door', 1]
    ]
  },
  {
    title: 'Start work',
    icon: '💼',
    steps: [
      ['Open the work surface', 'Touch the laptop', 1],
      ['Choose one target', 'Write one verb', 2],
      ['Start a short focus block', 'Set a 2-minute timer', 5]
    ]
  },
  {
    title: 'Bedtime landing',
    icon: '🌙',
    steps: [
      ['Dim the room', 'Turn off one bright light', 1],
      ['Park tomorrow thoughts', 'Write one thought', 2],
      ['Move toward bed', 'Sit on the bed', 2]
    ]
  },
  {
    title: 'Reset after interruption',
    icon: '🧭',
    steps: [
      ['Name where I stopped', 'Write one word', 1],
      ['Clear one distraction', 'Close one tab', 1],
      ['Restart tiny', 'Touch the next step', 2]
    ]
  }
] as const;

function blankStep(sortOrder: number, title = ''): RoutineStep {
  return {
    id: createId('step'),
    title,
    tinyTitle: '',
    estimateMinutes: 2,
    sortOrder
  };
}

export function RoutineEditor({
  routine,
  initialStep,
  onSaved
}: {
  routine?: Routine;
  initialStep?: string;
  onSaved(): void;
}) {
  const spark = useSpark();
  const theme = useTheme();
  const [title, setTitle] = useState(routine?.title ?? '');
  const [icon, setIcon] = useState(routine?.icon ?? '🚪');
  const [color, setColor] = useState(routine?.color ?? habitColors[0]);
  const [steps, setSteps] = useState<RoutineStep[]>(
    routine?.steps.length ? [...routine.steps].sort((a, b) => a.sortOrder - b.sortOrder) : [
      blankStep(0, initialStep ?? '')
    ]
  );
  const [saving, setSaving] = useState(false);
  const clearDraft = useLocalDraft(
    `routine-${routine?.id ?? 'new'}`,
    { title, icon, color, steps },
    (draft) => {
      setTitle(draft.title);
      setIcon(draft.icon);
      setColor(draft.color);
      setSteps(draft.steps);
    }
  );

  function updateStep(id: string, updates: Partial<RoutineStep>) {
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, ...updates } : step))
    );
  }

  function reorder(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    setSteps((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next.map((step, sortOrder) => ({ ...step, sortOrder }));
    });
  }

  function applyTemplate(template: (typeof templates)[number]) {
    setTitle(template.title);
    setIcon(template.icon);
    setSteps(
      template.steps.map(([stepTitle, tinyTitle, estimateMinutes], sortOrder) => ({
        id: createId('step'),
        title: stepTitle,
        tinyTitle,
        estimateMinutes,
        focusMinutes: stepTitle.toLowerCase().includes('focus') ? 5 : undefined,
        sortOrder
      }))
    );
  }

  async function save() {
    const valid = steps.filter((step) => step.title.trim());
    if (!title.trim() || !valid.length) {
      Alert.alert('Give the routine a shape', 'Add a title and at least one visible step.');
      return;
    }
    setSaving(true);
    try {
      await spark.saveRoutine({
        id: routine?.id ?? createId('routine'),
        title: title.trim(),
        icon,
        color,
        createdAt: routine?.createdAt ?? new Date().toISOString(),
        archivedAt: routine?.archivedAt,
        steps: valid.map((step, index) => ({
          ...step,
          title: step.title.trim(),
          tinyTitle: step.tinyTitle?.trim() || undefined,
          estimateMinutes: Math.max(1, step.estimateMinutes),
          focusMinutes: step.focusMinutes ? Math.max(1, step.focusMinutes) : undefined,
          sortOrder: index
        }))
      });
      await clearDraft();
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      {!routine ? (
        <Card>
          <SectionHeading>Start from an editable template</SectionHeading>
          <Muted>Templates are local starting points, not fixed programs.</Muted>
          <View style={styles.wrap}>
            {templates.map((template) => (
              <Chip
                key={template.title}
                label={`${template.icon} ${template.title}`}
                selected={title === template.title}
                onPress={() => applyTemplate(template)}
              />
            ))}
          </View>
        </Card>
      ) : null}
      <Card>
        <SectionHeading>Name the transition</SectionHeading>
        <FormField
          label="Routine"
          placeholder="e.g. Start work"
          value={title}
          onChangeText={setTitle}
          autoFocus={!routine}
          maxLength={80}
        />
        <View style={styles.wrap}>
          {icons.map((value) => (
            <Chip key={value} label={value} selected={icon === value} onPress={() => setIcon(value)} />
          ))}
        </View>
        <View style={styles.wrap}>
          {habitColors.map((value, index) => (
            <Text
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: color === value }}
              accessibilityLabel={`Choose ${colorNames[index]} color`}
              onPress={() => setColor(value)}
              style={[
                styles.color,
                { backgroundColor: value, borderColor: color === value ? theme.text : 'transparent' }
              ]}
            >
              {color === value ? '✓' : ''}
            </Text>
          ))}
        </View>
      </Card>

      <SectionHeading>Visible steps</SectionHeading>
      <Muted>
        Reorder freely. A step can link to a habit or open a short focus block.
      </Muted>
      {steps.map((step, index) => (
        <Card key={step.id}>
          <View style={styles.stepHeading}>
            <Text style={[styles.stepNumber, { color: theme.primary }]}>Step {index + 1}</Text>
            <View style={styles.stepControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Move step ${index + 1} up`}
                disabled={index === 0}
                onPress={() => reorder(index, -1)}
              >
                <Ionicons name="arrow-up" size={20} color={index === 0 ? theme.border : theme.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Move step ${index + 1} down`}
                disabled={index === steps.length - 1}
                onPress={() => reorder(index, 1)}
              >
                <Ionicons
                  name="arrow-down"
                  size={20}
                  color={index === steps.length - 1 ? theme.border : theme.text}
                />
              </Pressable>
              {steps.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove step ${index + 1}`}
                  onPress={() =>
                    Alert.alert('Remove this step?', 'The rest of the routine stays unchanged.', [
                      { text: 'Keep it', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () =>
                          setSteps((current) =>
                            current
                              .filter((candidate) => candidate.id !== step.id)
                              .map((candidate, sortOrder) => ({ ...candidate, sortOrder }))
                          )
                      }
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={20} color={theme.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </View>
          <FormField
            label="What is physically next?"
            placeholder="Open the laptop"
            value={step.title}
            onChangeText={(value) => updateStep(step.id, { title: value })}
            maxLength={100}
          />
          <FormField
            label="Tiny rescue version"
            hint="Optional, for a stuck moment."
            placeholder="Touch the laptop"
            value={step.tinyTitle}
            onChangeText={(value) => updateStep(step.id, { tinyTitle: value })}
            maxLength={100}
          />
          <View style={styles.inlineFields}>
            <View style={styles.inlineField}>
              <FormField
                label="Estimate min"
                value={String(step.estimateMinutes)}
                onChangeText={(value) => updateStep(step.id, { estimateMinutes: Number(value) || 1 })}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
            <View style={styles.inlineField}>
              <FormField
                label="Focus min"
                hint="Optional"
                value={step.focusMinutes ? String(step.focusMinutes) : ''}
                onChangeText={(value) =>
                  updateStep(step.id, { focusMinutes: value ? Number(value) || 2 : undefined })
                }
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
          </View>
          {spark.habits.filter((habit) => !habit.archivedAt).length ? (
            <>
              <Muted>Linked habit (optional)</Muted>
              <View style={styles.wrap}>
                <Chip
                  label="None"
                  selected={!step.linkedHabitId}
                  onPress={() => updateStep(step.id, { linkedHabitId: undefined })}
                />
                {spark.habits
                  .filter((habit) => !habit.archivedAt)
                  .slice(0, 8)
                  .map((habit) => (
                    <Chip
                      key={habit.id}
                      label={`${habit.icon} ${habit.title}`}
                      selected={step.linkedHabitId === habit.id}
                      onPress={() => updateStep(step.id, { linkedHabitId: habit.id })}
                    />
                  ))}
              </View>
            </>
          ) : null}
        </Card>
      ))}
      <Button
        label="Add another step"
        variant="secondary"
        onPress={() => setSteps((current) => [...current, blankStep(current.length)])}
      />
      <Button label={routine ? 'Save changes' : 'Save routine'} loading={saving} onPress={() => void save()} />
      {routine ? (
        <Card>
          <SectionHeading>Routine options</SectionHeading>
          <Button
            label="Duplicate routine"
            variant="secondary"
            onPress={() => void spark.duplicateRoutine(routine).then(onSaved)}
          />
          <Button
            label={routine.archivedAt ? 'Restore routine' : 'Archive routine'}
            variant={routine.archivedAt ? 'secondary' : 'danger'}
            onPress={() =>
              Alert.alert(
                routine.archivedAt ? 'Restore this routine?' : 'Archive this routine?',
                'Its steps stay in local storage and can be restored later.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: routine.archivedAt ? 'Restore' : 'Archive',
                    onPress: () =>
                      void (routine.archivedAt
                        ? spark.restoreRoutine(routine)
                        : spark.archiveRoutine(routine)
                      ).then(onSaved)
                  }
                ]
              )
            }
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  color: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 3,
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
    textAlignVertical: 'center'
  },
  stepHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepNumber: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  stepControls: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  inlineFields: { flexDirection: 'row', gap: 10 },
  inlineField: { flex: 1 }
});
