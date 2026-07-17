import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { Completion, Habit } from '@spark/domain';
import { loadHabitCompletionDates } from '../data/database';
import { useSpark } from '../state/SparkProvider';
import { MomentumCard } from './MomentumCard';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../data/database', () => ({ loadHabitCompletionDates: jest.fn() }));
jest.mock('../services/diagnostics', () => ({ reportError: jest.fn(async () => undefined) }));
jest.mock('../state/SparkProvider', () => ({ useSpark: jest.fn() }));

const mockedLoad = loadHabitCompletionDates as jest.MockedFunction<
  typeof loadHabitCompletionDates
>;
const mockedSpark = useSpark as jest.MockedFunction<typeof useSpark>;

const habit: Habit = {
  id: 'read',
  title: 'Read',
  color: '#8367E8',
  icon: '📚',
  variants: [{ id: 'tiny', kind: 'tiny', label: 'One line', targetMinutes: 1, reward: 1 }],
  schedule: { type: 'daily' },
  reminderEnabled: false,
  priority: 1,
  contexts: ['home'],
  createdAt: '2026-07-14T00:00:00.000Z',
  sortOrder: 0,
  momentum: {
    enabled: true,
    cadence: 'daily',
    anchorDate: '2026-07-14',
    protections: []
  }
};

function win(date: string): Completion {
  return {
    id: date,
    habitId: habit.id,
    variantId: 'tiny',
    variantKind: 'tiny',
    reward: 1,
    occurredAt: `${date}T10:00:00.000Z`,
    loggedAt: `${date}T10:00:00.000Z`,
    localDate: date,
    source: 'today'
  };
}

describe('MomentumCard', () => {
  const saveHabit = jest.fn(async () => undefined);
  const completions = [win('2026-07-14'), win('2026-07-15')];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-17T12:00:00.000Z'));
    mockedLoad.mockResolvedValue(completions);
    mockedSpark.mockReturnValue({
      completions,
      timeZone: 'UTC',
      saveHabit
    } as any);
  });

  afterEach(() => jest.useRealTimers());

  it('shows an intact personal best, a comeback invitation, and transparent passes', async () => {
    const view = await render(<MomentumCard habit={habit} />);
    await waitFor(() => expect(mockedLoad).toHaveBeenCalledWith('read'));
    expect(view.getByText('Personal best 2 · 2 total windows won')).toBeTruthy();
    expect(view.getByText(/A new chain can begin/)).toBeTruthy();
    expect(view.getByText('2')).toBeTruthy();
    expect(view.getByText(/Start with 2; earn 1 per 5 won windows/)).toBeTruthy();
  });

  it('uses a Flex pass on the most recent closed gap without inserting a win', async () => {
    const view = await render(<MomentumCard habit={habit} />);
    await fireEvent.press(
      view.getByRole('button', { name: /Use Flex pass for (Jul 16|16 Jul)/ })
    );
    await waitFor(() => expect(saveHabit).toHaveBeenCalledTimes(1));
    expect(saveHabit).toHaveBeenCalledWith({
      ...habit,
      momentum: {
        ...habit.momentum,
        protections: [{ windowStart: '2026-07-16', kind: 'flex' }]
      }
    });
  });

  it('delays the open window as planned rest without spending a Flex pass', async () => {
    const view = await render(<MomentumCard habit={habit} />);
    await fireEvent.press(
      view.getByRole('button', { name: 'Delay this Momentum window' })
    );
    await waitFor(() => expect(saveHabit).toHaveBeenCalledTimes(1));
    expect(saveHabit).toHaveBeenCalledWith({
      ...habit,
      momentum: {
        ...habit.momentum,
        protections: [{ windowStart: '2026-07-17', kind: 'delay' }]
      }
    });
  });
});
