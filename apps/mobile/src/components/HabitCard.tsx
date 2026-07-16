import type { ActionSuggestion, HabitVariant } from '@spark/domain';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { Card } from './Card';
import { Muted } from './Typography';

export function HabitCard({
  suggestion,
  onComplete,
  onEdit,
  showRewards = true
}: {
  suggestion: ActionSuggestion;
  onComplete(variant: HabitVariant): void;
  onEdit(): void;
  showRewards?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const { habit, variant } = suggestion;
  const variants = expanded ? habit.variants : [variant];

  return (
    <Card style={styles.card}>
      <View style={styles.heading}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${habit.title}`}
          onPress={onEdit}
          style={styles.titleArea}
        >
          <View style={[styles.icon, { backgroundColor: `${habit.color}25` }]}>
            <Text style={styles.emoji}>{habit.icon}</Text>
          </View>
          <View style={styles.titleText}>
            <Text style={[styles.title, { color: theme.text }]}>{habit.title}</Text>
            <Muted numberOfLines={1}>{suggestion.explanation}</Muted>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show one option' : 'Show all effort options'}
          onPress={() => setExpanded((value) => !value)}
          hitSlop={10}
        >
          <Ionicons
            name={expanded ? 'chevron-up' : 'options-outline'}
            size={22}
            color={theme.textMuted}
          />
        </Pressable>
      </View>
      <View style={styles.variants}>
        {variants.map((candidate) => (
          <Pressable
            key={candidate.id}
            accessibilityRole="button"
            accessibilityLabel={`Complete ${habit.title}: ${candidate.label}, ${candidate.targetMinutes} ${
              candidate.targetMinutes === 1 ? 'minute' : 'minutes'
            }`}
            onPress={() => onComplete(candidate)}
            style={({ pressed }) => [
              styles.variant,
              {
                backgroundColor: candidate.kind === 'tiny' ? theme.surfaceAlt : habit.color,
                borderColor: candidate.kind === 'tiny' ? theme.border : habit.color,
                opacity: pressed ? 0.72 : 1
              }
            ]}
          >
            <View style={styles.variantText}>
              <Text
                style={[
                  styles.variantLabel,
                  { color: candidate.kind === 'tiny' ? theme.text : '#FFFFFF' }
                ]}
              >
                {candidate.label}
              </Text>
              <Text
                style={[
                  styles.variantMeta,
                  { color: candidate.kind === 'tiny' ? theme.textMuted : '#FFFFFFCC' }
                ]}
              >
                {candidate.targetMinutes} min
                {showRewards ? ` · +${candidate.reward} sparks` : ''}
              </Text>
            </View>
            <View
              style={[
                styles.dopamineButton,
                {
                  backgroundColor:
                    candidate.kind === 'tiny' ? habit.color : 'rgba(255,255,255,0.22)'
                }
              ]}
            >
              <Ionicons name="sparkles" size={22} color="#FFFFFF" />
            </View>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emoji: { fontSize: 24 },
  titleText: { flex: 1, gap: 2 },
  title: { fontSize: 17, fontWeight: '800' },
  variants: { gap: 8 },
  variant: {
    minHeight: 62,
    borderRadius: 17,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  variantText: { flex: 1, gap: 2 },
  variantLabel: { fontSize: 15, fontWeight: '700' },
  variantMeta: { fontSize: 12, fontWeight: '600' },
  dopamineButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
