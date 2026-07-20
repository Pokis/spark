import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import OnboardingScreen from '../../app/onboarding';
import GuideScreen from '../../app/guide';
import JourneyScreen from '../../app/(tabs)/journey';
import TodayScreen from '../../app/(tabs)';
import { defaultAppConfig } from '@spark/cloud-contracts';
import { defaultSettings } from '../data/models';
import { useSpark } from '../state/SparkProvider';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }
}));

jest.mock('../state/SparkProvider', () => ({
  useSpark: jest.fn()
}));

const mockedSpark = useSpark as jest.MockedFunction<typeof useSpark>;
const mockedRouter = router as jest.Mocked<typeof router>;

const habit = {
  id: 'starter_water',
  title: 'Drink some water',
  color: '#20B8B2',
  icon: '💧',
  variants: [
    {
      id: 'tiny',
      kind: 'tiny' as const,
      label: 'Take one sip',
      targetMinutes: 1,
      reward: 1
    }
  ],
  schedule: { type: 'daily' as const },
  reminderEnabled: false,
  priority: 2 as const,
  contexts: ['anywhere' as const],
  createdAt: '2026-07-17T08:00:00.000Z',
  sortOrder: 0
};

function spark(overrides: Record<string, unknown> = {}) {
  return {
    habits: [habit],
    completions: [],
    completionTotals: { totalWins: 0, totalSparks: 0 },
    completionDailySummaries: [],
    focusSessions: [],
    routines: [],
    routineRuns: [],
    dailyCheckIns: [],
    habitDeferrals: [],
    weeklyPlans: [],
    personalExperiments: [],
    settings: defaultSettings,
    entitlement: { premium: false, source: 'none', expiresAt: null, checkedAt: null },
    remoteConfig: defaultAppConfig,
    timeZone: 'UTC',
    saveHabit: jest.fn(async () => undefined),
    completeHabit: jest.fn(async () => ({
      id: 'new-completion',
      habitId: habit.id,
      variantId: 'tiny',
      variantKind: 'tiny',
      reward: 1,
      occurredAt: '2026-07-17T12:00:00.000Z',
      loggedAt: '2026-07-17T12:00:00.000Z',
      localDate: '2026-07-17',
      source: 'today'
    })),
    undoCompletion: jest.fn(async () => undefined),
    setCheckIn: jest.fn(async () => undefined),
    updateSetting: jest.fn(async () => undefined),
    refresh: jest.fn(async () => undefined),
    ...overrides
  } as any;
}

describe('first-run understanding experience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-17T12:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('explains the minimal app, then requires an explicit frequency for the first habit', async () => {
    const value = spark();
    mockedSpark.mockReturnValue(value);
    const view = await render(<OnboardingScreen />);

    expect(view.getByText('A habit list and calendar.')).toBeTruthy();
    expect(view.getByText(/choose how often each should happen/)).toBeTruthy();
    expect(view.getByText(/Extra tools.*start hidden/)).toBeTruthy();
    await fireEvent.press(view.getByTestId('onboarding-continue'));
    expect(view.getByText('How often?')).toBeTruthy();
    await fireEvent.changeText(view.getByTestId('onboarding-first-habit'), 'Open my notes');
    await fireEvent.press(view.getByText('After I complete it'));
    await fireEvent.changeText(view.getByDisplayValue('2'), '3');
    await fireEvent.press(view.getByTestId('onboarding-continue'));
    await waitFor(() => expect(value.saveHabit).toHaveBeenCalled());
    expect(value.saveHabit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Open my notes',
        schedule: expect.objectContaining({ type: 'afterCompletion', everyDays: 3 }),
        variants: [expect.objectContaining({ kind: 'standard' })]
      })
    );
    expect(value.updateSetting).toHaveBeenCalledWith('onboardingComplete', true);
    expect(mockedRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows a live glossary and routes the user to reviewable progress', async () => {
    mockedSpark.mockReturnValue(
      spark({ completionTotals: { totalWins: 4, totalSparks: 7 } })
    );
    const view = await render(<GuideScreen />);

    expect(view.getByText('How Spark works')).toBeTruthy();
    expect(view.getByText('4')).toBeTruthy();
    expect(view.getByText('7')).toBeTruthy();
    expect(view.getByText(/tiny earns 1, standard earns 2/)).toBeTruthy();
    await fireEvent.press(
      view.getByRole('button', { name: 'Review my progress and habits' })
    );
    expect(mockedRouter.push).toHaveBeenCalledWith('/(tabs)/journey');
  });

  it('puts due habits first and keeps optional controls out of the default Today view', async () => {
    const value = spark();
    mockedSpark.mockReturnValue(value);
    const view = await render(<TodayScreen />);

    expect(view.getByText('Up next')).toBeTruthy();
    expect(view.getByText('Drink some water')).toBeTruthy();
    expect(view.queryByText('Adjust suggestions')).toBeNull();
    expect(view.queryByText(/Spark points/)).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Open habit calendar' }));
    expect(mockedRouter.push).toHaveBeenCalledWith('/(tabs)/journey');
  });

  it('shows completions in a calendar and keeps points hidden unless enabled', async () => {
    const completion = {
      id: 'completion-1',
      habitId: habit.id,
      variantId: 'tiny',
      variantKind: 'tiny' as const,
      reward: 1,
      occurredAt: '2026-07-17T10:00:00.000Z',
      loggedAt: '2026-07-17T10:00:00.000Z',
      localDate: '2026-07-17',
      source: 'today' as const
    };
    mockedSpark.mockReturnValue(
      spark({
        completions: [completion],
        completionTotals: { totalWins: 1, totalSparks: 1 },
        completionDailySummaries: [
          { localDate: '2026-07-17', wins: 1, sparks: 1, activeHabits: 1 }
        ]
      })
    );
    const view = await render(<JourneyScreen />);

    expect(view.getByRole('tab', { name: 'Month' }).props.accessibilityState).toEqual({ selected: true });
    expect(view.getByText('Drink some water')).toBeTruthy();
    expect(view.queryByText('1 Spark point')).toBeNull();
    await fireEvent.press(view.getByRole('tab', { name: 'Record' }));
    expect(view.getByText('Total completions')).toBeTruthy();
    expect(view.getByText('Active habits')).toBeTruthy();
    expect(view.queryByText('Points')).toBeNull();
    await fireEvent.press(
      view.getByRole('button', { name: 'Expand Recent completions' })
    );
    await fireEvent.press(view.getByText('💧 Drink some water'));
    expect(mockedRouter.push).toHaveBeenCalledWith('/habit/starter_water/history');
  });
});
