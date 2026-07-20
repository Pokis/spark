import Ionicons from '@expo/vector-icons/Ionicons';
import { scheduleLabel, type ActionSuggestion, type HabitVariant } from '@spark/domain';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { Card } from './Card';
import { Muted } from './Typography';

export function HabitCard({
  suggestion,
  onComplete,
  onTiny,
  onFocus,
  onDefer,
  onEdit,
  saving = false,
  showRewards = false,
  showSizes = false,
  showExtraActions = false,
  showExplanation = false,
  doneLabel = 'Done'
}: {
  suggestion: ActionSuggestion;
  onComplete(variant: HabitVariant): void;
  onTiny?(): void;
  onFocus?(minutes: number): void;
  onDefer?(kind: 'not_now' | 'later_today' | 'tomorrow' | 'quiet_today'): void;
  onEdit(): void;
  saving?: boolean;
  showRewards?: boolean;
  showSizes?: boolean;
  showExtraActions?: boolean;
  showExplanation?: boolean;
  doneLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const { habit, variant } = suggestion;
  const hasSizes = showSizes && habit.variants.length > 1;
  const hasExtraActions = showExtraActions && Boolean(onTiny || onFocus || onDefer);
  const canExpand = hasSizes || hasExtraActions;

  return (
    <Card style={styles.card}>
      <View style={styles.mainRow}>
        <View style={[styles.icon, { backgroundColor: `${habit.color}22` }]}>
          <Text style={styles.emoji}>{habit.icon}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${habit.title}`}
          onPress={onEdit}
          style={styles.titleArea}
        >
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>{habit.title}</Text>
          <Muted numberOfLines={1}>
            {showExplanation ? suggestion.explanation : scheduleLabel(habit.schedule)}
          </Muted>
        </Pressable>
        {canExpand ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={expanded ? `Hide options for ${habit.title}` : `More options for ${habit.title}`}
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((value) => !value)}
            style={[styles.moreButton, { borderColor: theme.border }]}
          >
            <Ionicons name={expanded ? 'chevron-up' : 'options-outline'} size={20} color={theme.textMuted} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Mark ${habit.title} done${hasSizes ? ` using ${variant.label}` : ''}`}
          accessibilityState={{ disabled: saving, busy: saving }}
          disabled={saving}
          onPress={() => onComplete(variant)}
          style={({ pressed }) => [
            styles.doneButton,
            { backgroundColor: habit.color, opacity: saving ? 0.5 : pressed ? 0.75 : 1 }
          ]}
        >
          <Ionicons name="checkmark" size={22} color="#FFFFFF" />
          <Text style={styles.doneText}>{saving ? '…' : doneLabel}</Text>
        </Pressable>
      </View>

      {expanded && hasSizes ? (
        <View style={styles.sizes}>
          {habit.variants.map((candidate) => (
            <Pressable
              key={candidate.id}
              accessibilityRole="button"
              accessibilityLabel={`Mark ${habit.title} done: ${candidate.label}`}
              disabled={saving}
              onPress={() => onComplete(candidate)}
              style={[styles.sizeChoice, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
            >
              <View style={styles.sizeText}>
                <Text style={[styles.sizeTitle, { color: theme.text }]}>{candidate.label}</Text>
                <Muted>{candidate.targetMinutes} min{showRewards ? ` · ${candidate.reward} points` : ''}</Muted>
              </View>
              <Ionicons name="checkmark-circle-outline" size={23} color={habit.color} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {expanded && hasExtraActions ? (
        <View style={styles.extraActions}>
          {onTiny ? <Pressable accessibilityRole="button" accessibilityLabel={`Mark the smallest version of ${habit.title} done`} onPress={onTiny} style={[styles.extra, { borderColor: theme.border }]}><Text style={[styles.extraText, { color: theme.text }]}>Smallest done</Text></Pressable> : null}
          {onFocus ? <Pressable accessibilityRole="button" accessibilityLabel={`Focus on ${habit.title} for 2 minutes`} onPress={() => onFocus(2)} style={[styles.extra, { borderColor: theme.border }]}><Text style={[styles.extraText, { color: theme.text }]}>Focus 2 min</Text></Pressable> : null}
          {onDefer ? <Pressable accessibilityRole="button" accessibilityLabel={`Move ${habit.title} to tomorrow`} onPress={() => onDefer('tomorrow')} style={[styles.extra, { borderColor: theme.border }]}><Text style={[styles.extraText, { color: theme.text }]}>Tomorrow</Text></Pressable> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, gap: 10 },
  mainRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emoji: { fontSize: 23 },
  titleArea: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 16, fontWeight: '800' },
  moreButton: { width: 40, height: 44, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  doneButton: { minWidth: 62, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  doneText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  sizes: { gap: 7, paddingTop: 2 },
  sizeChoice: { minHeight: 54, borderRadius: 14, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sizeText: { flex: 1, gap: 2 },
  sizeTitle: { fontSize: 14, fontWeight: '700' },
  extraActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  extra: { minHeight: 40, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  extraText: { fontSize: 12, fontWeight: '700' }
});
