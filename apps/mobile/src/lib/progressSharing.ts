import type { Completion, Habit } from '@spark/domain';

export const MAX_SHARED_WINS = 5;

export function progressWinLabel(
  completion: Completion | undefined,
  habits: Habit[]
): string {
  const habit = habits.find((item) => item.id === completion?.habitId);
  const variant = habit?.variants.find(
    (item) => item.id === completion?.variantId
  );
  return `${habit?.icon ?? '✦'} ${
    variant?.label ?? habit?.title ?? 'A private win'
  }`;
}

export function toggleSharedWin(
  current: string[],
  id: string,
  limit = MAX_SHARED_WINS
): { selected: string[]; atLimit: boolean } {
  if (current.includes(id)) {
    return { selected: current.filter((item) => item !== id), atLimit: false };
  }
  if (current.length >= limit) return { selected: current, atLimit: true };
  return { selected: [...current, id], atLimit: false };
}

export function progressShareText(
  completionIds: string[],
  completions: Completion[],
  habits: Habit[]
): string {
  return [
    'A few wins I chose to share:',
    ...completionIds.map((id) =>
      `• ${progressWinLabel(
        completions.find((item) => item.id === id),
        habits
      )}`
    ),
    '',
    'Selected and shared from Spark.'
  ].join('\n');
}
