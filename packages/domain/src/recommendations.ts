import { isHabitDue } from './schedule';
import type {
  ActionSuggestion,
  Capacity,
  Completion,
  Habit,
  HabitContext,
  HabitVariant,
} from './types';
import { localDateKey } from './time';

export interface PlanInput {
  habits: Habit[];
  completions: Completion[];
  now: Date;
  timeZone: string;
  capacity: Capacity;
  availableMinutes?: number;
  context?: HabitContext;
  limit?: number;
}

function preferredVariant(
  habit: Habit,
  capacity: Capacity,
  availableMinutes?: number,
): HabitVariant {
  const sorted = [...habit.variants].sort((a, b) => a.targetMinutes - b.targetMinutes);
  const capacityKind = capacity === 'empty' ? 'tiny' : capacity === 'ready' ? 'stretch' : 'standard';
  const capacityMatch = sorted.find((variant) => variant.kind === capacityKind);
  const timeMatch =
    availableMinutes == null
      ? undefined
      : [...sorted].reverse().find((variant) => variant.targetMinutes <= availableMinutes);
  return timeMatch ?? capacityMatch ?? sorted[0] ?? {
    id: `${habit.id}-default`,
    kind: 'standard',
    label: habit.title,
    targetMinutes: 5,
    reward: 2,
  };
}

export function buildTodayPlan(input: PlanInput): ActionSuggestion[] {
  const today = localDateKey(input.now, input.timeZone);

  return input.habits
    .filter((habit) =>
      isHabitDue(habit, {
        now: input.now,
        timeZone: input.timeZone,
        completions: input.completions,
      }),
    )
    .map((habit) => {
      const variant = preferredVariant(habit, input.capacity, input.availableMinutes);
      let score = habit.priority * 20;
      const explanations: string[] = [];

      if (input.context && habit.contexts.includes(input.context)) {
        score += 12;
        explanations.push(`Fits ${input.context}`);
      }
      if (input.availableMinutes != null && variant.targetMinutes <= input.availableMinutes) {
        score += 15;
        explanations.push(`Fits your ${input.availableMinutes} minutes`);
      }
      if (variant.kind === 'tiny' && input.capacity === 'empty') {
        score += 18;
        explanations.push('A gentle place to start');
      }
      const latest = input.completions
        .filter((completion) => completion.habitId === habit.id)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
      if (!latest) {
        score += 5;
        explanations.push('A fresh first win');
      } else if (latest.localDate < today) {
        score += Math.min(10, Math.max(0, today.localeCompare(latest.localDate)));
      }

      return {
        habit,
        variant,
        score,
        explanation: explanations[0] ?? 'You marked this as important',
      };
    })
    .sort((a, b) => b.score - a.score || a.habit.sortOrder - b.habit.sortOrder)
    .slice(0, input.limit ?? 3);
}
