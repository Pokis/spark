import { localDateKey, type Completion, type Habit } from '@spark/domain';
import type { PersonalExperiment } from '../data/models';

export function activeExperimentForHabit(
  experiments: PersonalExperiment[],
  habitId: string,
  kind?: PersonalExperiment['kind'],
  now = new Date()
): PersonalExperiment | undefined {
  return experiments.find(
    (experiment) =>
      experiment.habitId === habitId &&
      experiment.status === 'active' &&
      (!kind || experiment.kind === kind) &&
      Date.parse(experiment.startedAt) <= now.getTime() &&
      Date.parse(experiment.endsAt) > now.getTime()
  );
}

export function habitsWithExperimentReminders(
  habits: Habit[],
  experiments: PersonalExperiment[],
  now = new Date()
): Habit[] {
  return habits.map((habit) =>
    activeExperimentForHabit(experiments, habit.id, 'afternoon_reminder', now)
      ? {
          ...habit,
          reminderEnabled: true,
          reminderWindow: 'afternoon'
        }
      : habit
  );
}

function countDaysWithCompletion(
  completions: Completion[],
  habitId: string,
  start: string,
  end: string,
  predicate: (completion: Completion) => boolean
): number {
  return new Set(
    completions
      .filter(
        (completion) =>
          completion.habitId === habitId &&
          completion.localDate >= start &&
          completion.localDate <= end &&
          predicate(completion)
      )
      .map((completion) => completion.localDate)
  ).size;
}

export interface ExperimentComparison {
  baselineDays: number;
  experimentDays: number;
  summary: string;
}

export function compareExperiment(
  experiment: PersonalExperiment,
  completions: Completion[],
  timeZone: string
): ExperimentComparison {
  const experimentStart = experiment.startedAt.slice(0, 10);
  const experimentEnd = localDateKey(
    new Date(Math.min(Date.now(), Date.parse(experiment.endsAt))),
    timeZone
  );
  const predicate =
    experiment.kind === 'tiny_week'
      ? (completion: Completion) => completion.variantKind === 'tiny'
      : (completion: Completion) => {
          const hour = Number(
            new Intl.DateTimeFormat('en-US', {
              timeZone,
              hour: '2-digit',
              hourCycle: 'h23'
            }).format(new Date(completion.occurredAt))
          );
          return hour >= 12 && hour < 18;
        };
  const baselineDays = countDaysWithCompletion(
    completions,
    experiment.habitId,
    experiment.baselineStart,
    experiment.baselineEnd,
    predicate
  );
  const experimentDays = countDaysWithCompletion(
    completions,
    experiment.habitId,
    experimentStart,
    experimentEnd,
    predicate
  );
  const label =
    experiment.kind === 'tiny_week' ? 'tiny-version days' : 'afternoon completion days';
  return {
    baselineDays,
    experimentDays,
    summary:
      baselineDays === experimentDays
        ? `${label}: ${baselineDays} before and ${experimentDays} during. The counts matched.`
        : experimentDays > baselineDays
          ? `${label}: ${baselineDays} before and ${experimentDays} during. The completed-action count increased.`
          : `${label}: ${baselineDays} before and ${experimentDays} during. Review the week and choose what to try next.`
  };
}
