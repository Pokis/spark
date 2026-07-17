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
        name: 'Log a win for Drink water: One sip, 1 minute, earns 1 Spark point'
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
    expect(view.getByText('Stretch action · 5 min · earns 3 Spark points')).toBeTruthy();
  });

  it('blocks completion controls while a completion is saving', async () => {
    const onComplete = jest.fn();
    const view = await render(
      <HabitCard
        suggestion={suggestion}
        onComplete={onComplete}
        onEdit={jest.fn()}
        saving
      />
    );
    await fireEvent.press(
      view.getByRole('button', {
        name: 'Log a win for Drink water: One sip, 1 minute, earns 1 Spark point'
      })
    );
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('exposes direct tiny, two-minute, and neutral deferral actions', async () => {
    const onTiny = jest.fn();
    const onFocus = jest.fn();
    const onDefer = jest.fn();
    const view = await render(
      <HabitCard
        suggestion={suggestion}
        onComplete={jest.fn()}
        onEdit={jest.fn()}
        onTiny={onTiny}
        onFocus={onFocus}
        onDefer={onDefer}
      />
    );
    await fireEvent.press(view.getByRole('button', { name: 'Log the tiny version of Drink water' }));
    await fireEvent.press(
      view.getByRole('button', { name: 'Start a two minute focus session for Drink water' })
    );
    await fireEvent.press(
      view.getByRole('button', { name: 'Show neutral deferral choices for Drink water' })
    );
    await fireEvent.press(
      view.getByRole('button', {
        name: 'Tomorrow for Drink water; this does not record a failure'
      })
    );
    expect(onTiny).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledWith(2);
    expect(onDefer).toHaveBeenCalledWith('tomorrow');
  });

  it('makes an enabled optional Momentum streak discoverable from Today', async () => {
    const view = await render(
      <HabitCard
        suggestion={{
          ...suggestion,
          habit: {
            ...suggestion.habit,
            momentum: {
              enabled: true,
              cadence: 'everyOtherDay',
              anchorDate: '2026-07-17',
              protections: []
            }
          }
        }}
        onComplete={jest.fn()}
        onEdit={jest.fn()}
      />
    );
    expect(view.getByText('✦ Momentum on · review in Progress')).toBeTruthy();
  });
});
