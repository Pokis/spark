import type { Habit, Routine } from '@spark/domain';

export const starterHabits: Habit[] = [
  {
    id: 'starter_water',
    title: 'Drink some water',
    reason: 'A hydrated brain gets a kinder starting point.',
    cue: 'After I unlock my phone in the morning',
    color: '#20B8B2',
    icon: '💧',
    variants: [
      {
        id: 'starter_water_tiny',
        kind: 'tiny',
        label: 'Take one sip',
        targetMinutes: 1,
        reward: 1
      },
      {
        id: 'starter_water_standard',
        kind: 'standard',
        label: 'Drink a glass',
        targetMinutes: 2,
        reward: 2
      },
      {
        id: 'starter_water_stretch',
        kind: 'stretch',
        label: 'Refill a bottle too',
        targetMinutes: 4,
        reward: 3
      }
    ],
    schedule: { type: 'daily' },
    preferredTime: '09:00',
    reminderEnabled: false,
    priority: 2,
    contexts: ['anywhere'],
    createdAt: new Date().toISOString(),
    sortOrder: 0
  },
  {
    id: 'starter_reset',
    title: 'Reset one surface',
    reason: 'Visible calm can reduce the next task’s activation energy.',
    color: '#8367E8',
    icon: '✨',
    variants: [
      {
        id: 'starter_reset_tiny',
        kind: 'tiny',
        label: 'Put away one thing',
        targetMinutes: 1,
        reward: 1
      },
      {
        id: 'starter_reset_standard',
        kind: 'standard',
        label: 'Clear one small surface',
        targetMinutes: 5,
        reward: 2
      },
      {
        id: 'starter_reset_stretch',
        kind: 'stretch',
        label: 'Do a 10-minute reset',
        targetMinutes: 10,
        reward: 3
      }
    ],
    schedule: { type: 'timesPerWeek', count: 3 },
    reminderEnabled: false,
    priority: 1,
    contexts: ['home'],
    createdAt: new Date().toISOString(),
    sortOrder: 1
  }
];

export const starterRoutines: Routine[] = [
  {
    id: 'starter_leave_home',
    title: 'Leave home',
    icon: '🚪',
    color: '#FF6B5F',
    createdAt: new Date().toISOString(),
    steps: [
      {
        id: 'starter_leave_home_1',
        title: 'Keys, wallet, phone',
        tinyTitle: 'Touch all three',
        estimateMinutes: 1,
        sortOrder: 0
      },
      {
        id: 'starter_leave_home_2',
        title: 'Shoes and outer layer',
        estimateMinutes: 2,
        sortOrder: 1
      },
      {
        id: 'starter_leave_home_3',
        title: 'Check the door',
        estimateMinutes: 1,
        sortOrder: 2
      }
    ]
  }
];
