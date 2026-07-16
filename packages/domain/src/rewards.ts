import type { Completion, RewardSummary } from './types';

export function rewardSummary(completions: Completion[]): RewardSummary {
  const totalSparks = completions.reduce((sum, completion) => sum + completion.reward, 0);
  const level = Math.floor(Math.sqrt(totalSparks / 10)) + 1;
  const currentLevelStart = Math.pow(level - 1, 2) * 10;
  const nextLevelAt = Math.pow(level, 2) * 10;
  return {
    totalSparks,
    level,
    levelProgress:
      nextLevelAt === currentLevelStart
        ? 1
        : (totalSparks - currentLevelStart) / (nextLevelAt - currentLevelStart),
    nextLevelAt,
  };
}

export function rewardForVariant(kind: 'tiny' | 'standard' | 'stretch'): number {
  if (kind === 'tiny') return 1;
  if (kind === 'stretch') return 3;
  return 2;
}
