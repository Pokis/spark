import type { RoutineStep } from '@spark/domain';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { FormField } from '../../src/components/FormField';
import { Screen } from '../../src/components/Screen';
import { Muted, SectionHeading } from '../../src/components/Typography';
import { createId } from '../../src/lib/id';
import { useSpark } from '../../src/state/SparkProvider';
import { habitColors, useTheme } from '../../src/theme';

const icons = ['🚪', '☀️', '🌙', '💼', '🧹', '🛁', '🍳', '🧳'];

export default function NewRoutineScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('🚪');
  const [color, setColor] = useState(habitColors[0]);
  const [steps, setSteps] = useState<RoutineStep[]>([
    {
      id: createId('step'),
      title: '',
      tinyTitle: '',
      estimateMinutes: 1,
      sortOrder: 0
    }
  ]);
  const [saving, setSaving] = useState(false);

  function updateStep(id: string, updates: Partial<RoutineStep>) {
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, ...updates } : step))
    );
  }

  function addStep() {
    setSteps((current) => [
      ...current,
      {
        id: createId('step'),
        title: '',
        tinyTitle: '',
        estimateMinutes: 2,
        sortOrder: current.length
      }
    ]);
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
        id: createId('routine'),
        title: title.trim(),
        icon,
        color,
        createdAt: new Date().toISOString(),
        steps: valid.map((step, index) => ({
          ...step,
          title: step.title.trim(),
          tinyTitle: step.tinyTitle?.trim() || undefined,
          estimateMinutes: Math.max(1, step.estimateMinutes),
          sortOrder: index
        }))
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Card>
        <SectionHeading>Name the transition</SectionHeading>
        <FormField
          label="Routine"
          placeholder="e.g. Start work"
          value={title}
          onChangeText={setTitle}
          autoFocus
          maxLength={80}
        />
        <View style={styles.wrap}>
          {icons.map((value) => (
            <Chip
              key={value}
              label={value}
              selected={icon === value}
              onPress={() => setIcon(value)}
            />
          ))}
        </View>
        <View style={styles.wrap}>
          {habitColors.map((value) => (
            <Text
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: color === value }}
              accessibilityLabel={`Choose color ${value}`}
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

      <SectionHeading>Visible steps</SectionHeading>
      <Muted>Keep each step literal. Spark will show only one at a time when the routine runs.</Muted>
      {steps.map((step, index) => (
        <Card key={step.id}>
          <View style={styles.stepHeading}>
            <Text style={[styles.stepNumber, { color: theme.primary }]}>Step {index + 1}</Text>
            {steps.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove step ${index + 1}`}
                onPress={() =>
                  setSteps((current) =>
                    current
                      .filter((candidate) => candidate.id !== step.id)
                      .map((candidate, nextIndex) => ({
                        ...candidate,
                        sortOrder: nextIndex
                      }))
                  )
                }
              >
                <Ionicons name="trash-outline" size={20} color={theme.textMuted} />
              </Pressable>
            ) : null}
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
          <FormField
            label="Estimated minutes"
            value={String(step.estimateMinutes)}
            onChangeText={(value) =>
              updateStep(step.id, { estimateMinutes: Number(value) || 1 })
            }
            keyboardType="number-pad"
            maxLength={3}
          />
        </Card>
      ))}
      <Button label="Add another step" variant="secondary" onPress={addStep} />
      <Button label="Save routine" loading={saving} onPress={() => void save()} />
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
  stepNumber: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase' }
});
