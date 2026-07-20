import type { Habit, Routine } from '@spark/domain';

// New installations begin empty. The first screen explains exactly how to add a
// habit, so sample content never competes with the user's own list. Existing
// installations keep their records; schema 9 archives the old built-in sample IDs
// so they no longer compete with the person's active list.
export const starterHabits: Habit[] = [];
export const starterRoutines: Routine[] = [];
