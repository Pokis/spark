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
  onTiny,
  onFocus,
  onDefer,
  onEdit,
  saving = false,
  showRewards = true
}: {
  suggestion: ActionSuggestion;
  onComplete(variant: HabitVariant): void;
  onTiny?(): void;
  onFocus?(minutes: number): void;
  onDefer?(kind: 'not_now' | 'later_today' | 'tomorrow' | 'quiet_today'): void;
  onEdit(): void;
  saving?: boolean;
  showRewards?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showLater, setShowLater] = useState(false);
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
            {habit.momentum?.enabled ? (
              <Text style={[styles.momentum, { color: habit.color }]}>✦ Momentum on · review in Progress</Text>
            ) : null}
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
            accessibilityLabel={`Log a win for ${habit.title}: ${candidate.label}, ${candidate.targetMinutes} ${
              candidate.targetMinutes === 1 ? 'minute' : 'minutes'
            }${showRewards ? `, earns ${candidate.reward} ${candidate.reward === 1 ? 'Spark point' : 'Spark points'}` : ''}`}
            accessibilityState={{ disabled: saving, busy: saving }}
            disabled={saving}
            onPress={() => onComplete(candidate)}
            style={({ pressed }) => [
              styles.variant,
              {
                backgroundColor: candidate.kind === 'tiny' ? theme.surfaceAlt : habit.color,
                borderColor: candidate.kind === 'tiny' ? theme.border : habit.color,
                opacity: saving ? 0.5 : pressed ? 0.72 : 1
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
                {candidate.kind[0]!.toUpperCase() + candidate.kind.slice(1)} action ·{' '}
                {candidate.targetMinutes} min
                {showRewards
                  ? ` · earns ${candidate.reward} ${candidate.reward === 1 ? 'Spark point' : 'Spark points'}`
                  : ''}
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
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.logText}>{saving ? 'Saving' : 'Log'}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      {expanded &&
      (habit.friction?.firstStep ||
        habit.friction?.environment ||
        habit.friction?.fallback ||
        habit.friction?.futureNote) ? (
        <View style={[styles.friction, { backgroundColor: theme.surfaceAlt }]}>
          <Text style={[styles.frictionTitle, { color: theme.text }]}>Make starting easier</Text>
          {habit.friction.firstStep ? (
            <Muted>First contact: {habit.friction.firstStep}</Muted>
          ) : null}
          {habit.friction.environment ? (
            <Muted>Set up: {habit.friction.environment}</Muted>
          ) : null}
          {habit.friction.fallback ? (
            <Muted>If stuck: {habit.friction.fallback}</Muted>
          ) : null}
          {habit.friction.futureNote ? (
            <Muted>Future-you note: {habit.friction.futureNote}</Muted>
          ) : null}
        </View>
      ) : null}
      {onTiny || onFocus || onDefer ? <View style={styles.quickActions}>
        {onTiny ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Log the tiny version of ${habit.title}`}
          accessibilityState={{ disabled: saving, busy: saving }}
          disabled={saving}
          onPress={onTiny}
          style={[styles.quickAction, { backgroundColor: theme.surfaceAlt }]}
        >
          <Ionicons name="resize-outline" size={17} color={theme.primary} />
          <Text style={[styles.quickActionText, { color: theme.text }]}>Log tiny</Text>
        </Pressable>
        ) : null}
        {onFocus ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Start a two minute focus session for ${habit.title}`}
          onPress={() => onFocus(2)}
          style={[styles.quickAction, { backgroundColor: theme.surfaceAlt }]}
        >
          <Ionicons name="timer-outline" size={17} color={theme.primary} />
          <Text style={[styles.quickActionText, { color: theme.text }]}>2-min launch</Text>
        </Pressable>
        ) : null}
        {onDefer ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Show neutral deferral choices for ${habit.title}`}
          accessibilityState={{ expanded: showLater }}
          onPress={() => setShowLater((value) => !value)}
          style={[styles.quickAction, { backgroundColor: theme.surfaceAlt }]}
        >
          <Ionicons name="time-outline" size={17} color={theme.textMuted} />
          <Text style={[styles.quickActionText, { color: theme.text }]}>Later</Text>
        </Pressable>
        ) : null}
      </View> : null}
      {showLater && onDefer ? (
        <View style={styles.deferActions}>
          {(
            [
              ['not_now', 'Not now'],
              ['later_today', 'Later today'],
              ['tomorrow', 'Tomorrow'],
              ['quiet_today', 'Quiet today']
            ] as const
          ).map(([kind, label]) => (
            <Pressable
              key={kind}
              accessibilityRole="button"
              accessibilityLabel={`${label} for ${habit.title}; this does not record a failure`}
              onPress={() => onDefer(kind)}
              style={[styles.defer, { borderColor: theme.border }]}
            >
              <Text style={[styles.deferText, { color: theme.textMuted }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
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
  momentum: { fontSize: 12, fontWeight: '700' },
  variants: { gap: 8 },
  friction: { borderRadius: 14, padding: 12, gap: 4 },
  frictionTitle: { fontSize: 13, fontWeight: '800' },
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
    width: 54,
    minHeight: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  quickAction: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  quickActionText: { fontSize: 12, fontWeight: '700' },
  deferActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  defer: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deferText: { fontSize: 12, fontWeight: '700' }
});
