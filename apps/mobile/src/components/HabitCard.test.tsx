import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import type { ActionSuggestion } from '@spark/domain';
import { HabitCard } from './HabitCard';

const suggestion: ActionSuggestion = {
  habit: {
    id: 'water',
    title: 'Drink water',
    color: '#20B8B2',
    icon: '💧',
    variants: [
      { id: 'tiny', kind: 'tiny', label: 'One sip', targetMinutes: 1, reward: 1 },
      { id: 'standard', kind: 'standard', label: 'One glass', targetMinutes: 3, reward: 2 },
      { id: 'stretch', kind: 'stretch', label: 'Refill bottle', targetMinutes: 5, reward: 3 }
    ],
    schedule: { type: 'daily' },
    reminderEnabled: false,
    priority: 2,
    contexts: ['anywhere'],
    createdAt: '2026-01-01T00:00:00.000Z',
    sortOrder: 0
  },
  variant: { id: 'tiny', kind: 'tiny', label: 'One sip', targetMinutes: 1, reward: 1 },
  score: 10,
  explanation: 'A gentle place to start'
};

describe('HabitCard', () => {
  it('makes the recommended variant a single accessible completion action', async () => {
    const onComplete = jest.fn();
    const view = await render(
      <HabitCard suggestion={suggestion} onComplete={onComplete} onEdit={jest.fn()} />
    );
    await fireEvent.press(
      view.getByRole('button', {
        name: 'Complete Drink water: One sip, 1 minutes'
      })
    );
    expect(onComplete).toHaveBeenCalledWith(suggestion.variant);
  });

  it('reveals all transparent effort and reward options', async () => {
    const view = await render(
      <HabitCard suggestion={suggestion} onComplete={jest.fn()} onEdit={jest.fn()} />
    );
    await fireEvent.press(view.getByRole('button', { name: 'Show all effort options' }));
    expect(view.getByText('One glass')).toBeTruthy();
    expect(view.getByText('5 min · +3 sparks')).toBeTruthy();
  });
});
