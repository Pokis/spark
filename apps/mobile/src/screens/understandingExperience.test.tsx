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

  it('defines the app, habits, wins, and fixed points before asking for a habit', async () => {
    const value = spark();
    mockedSpark.mockReturnValue(value);
    const view = await render(<OnboardingScreen />);

    expect(view.getByText(/Spark is the name of this app/)).toBeTruthy();
    await fireEvent.press(view.getByTestId('onboarding-continue'));
    expect(view.getByText('Habit = what you want to repeat')).toBeTruthy();
    await fireEvent.press(view.getByTestId('onboarding-continue'));
    expect(view.getByText('Tiny = 1 point')).toBeTruthy();
    expect(view.getByText(/Points never appear randomly/)).toBeTruthy();
    await fireEvent.press(view.getByTestId('onboarding-continue'));
    expect(view.getByText('Your real life stays on this device.')).toBeTruthy();
    await fireEvent.press(view.getByTestId('onboarding-continue'));
    expect(view.getByText(/includes two editable examples/)).toBeTruthy();

    await fireEvent.changeText(view.getByTestId('onboarding-first-habit'), 'Open my notes');
    await fireEvent.press(view.getByTestId('onboarding-continue'));
    await waitFor(() => expect(value.saveHabit).toHaveBeenCalled());
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

  it('explains first actions and confirms filters and One-thing day immediately', async () => {
    const value = spark();
    mockedSpark.mockReturnValue(value);
    const view = await render(<TodayScreen />);

    expect(view.getByText('New here? Start with this')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Dismiss' }));
    expect(value.updateSetting).toHaveBeenCalledWith('dismissedTutorialIds', [
      'getting-started'
    ]);
    expect(view.getByText('Tiny 1 · standard 2 · stretch 3')).toBeTruthy();
    expect(view.getByText(/Tap Log only when you want to record a win/)).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: /Running low/ }));
    await waitFor(() =>
      expect(value.setCheckIn).toHaveBeenCalledWith('empty', null, null)
    );
    expect(view.getByText(/Running-low selected/)).toBeTruthy();

    await fireEvent.press(
      view.getByRole('button', { name: 'Show only one tiny action' })
    );
    await waitFor(() =>
      expect(value.updateSetting).toHaveBeenCalledWith('minimumViableDay', true)
    );
    expect(view.getByText(/One-thing day is on/)).toBeTruthy();
  });

  it('shows exactly which logged win produced each point entry', async () => {
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

    expect(view.getByText('1 Spark point')).toBeTruthy();
    expect(view.getByText('💧 Take one sip')).toBeTruthy();
    expect(view.getByText('+1')).toBeTruthy();
    await fireEvent.press(
      view.getByRole('button', {
        name: 'Open history for Drink some water; 1 Spark point'
      })
    );
    expect(mockedRouter.push).toHaveBeenCalledWith('/habit/starter_water/history');
  });
});
