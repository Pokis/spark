import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert, Share } from 'react-native';
import { useSpark } from '../state/SparkProvider';
import { openCalendarExport } from '../services/calendarBridge';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import HelpScreen from '../../app/help';
import WeeklyResetScreen from '../../app/weekly-reset';
import DepartureScreen from '../../app/departure';
import ExperimentsScreen from '../../app/experiments';
import ShareProgressScreen from '../../app/share-progress';
import { defaultSettings } from '../data/models';
import { endOfToday } from '../lib/sensory';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true)
  }
}));

jest.mock('../state/SparkProvider', () => ({
  useSpark: jest.fn()
}));

jest.mock('../services/calendarBridge', () => ({
  openCalendarExport: jest.fn(async () => true)
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(async () => 'cache/progress.png')
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(async () => undefined)
}));

const mockedSpark = useSpark as jest.MockedFunction<typeof useSpark>;
const mockedRouter = router as jest.Mocked<typeof router>;

const habits = Array.from({ length: 6 }, (_, index) => ({
  id: `habit-${index}`,
  title: `Habit ${index}`,
  color: '#ffffff',
  icon: '✦',
  variants: [
    {
      id: `tiny-${index}`,
      kind: 'tiny' as const,
      label: `Tiny ${index}`,
      targetMinutes: 1,
      reward: 1
    }
  ],
  schedule: { type: 'daily' as const },
  reminderEnabled: false,
  priority: 1,
  contexts: ['anywhere' as const],
  createdAt: '2026-07-01T00:00:00.000Z',
  sortOrder: index
}));

function spark(overrides: Record<string, unknown> = {}) {
  return {
    loading: false,
    timeZone: 'UTC',
    habits,
    completions: [],
    routines: [],
    routineRuns: [],
    weeklyPlans: [],
    departurePlans: [],
    personalExperiments: [],
    settings: defaultSettings,
    updateSetting: jest.fn(async () => undefined),
    saveWeeklyPlan: jest.fn(async () => undefined),
    saveDeparturePlan: jest.fn(async () => undefined),
    savePersonalExperiment: jest.fn(async () => undefined),
    ...overrides
  } as any;
}

describe('new local-first feature screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-16T12:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('routes contextual help to Simple mode, Departure, and sensory quiet', async () => {
    const value = spark();
    mockedSpark.mockReturnValue(value);
    const view = await render(<HelpScreen />);

    await fireEvent.press(
      view.getByRole('button', { name: 'Everything feels too much' })
    );
    await fireEvent.press(
      view.getByRole('button', { name: 'Turn on Simple mode' })
    );
    await waitFor(() =>
      expect(value.updateSetting).toHaveBeenCalledWith('simpleMode', true)
    );
    expect(mockedRouter.replace).toHaveBeenCalledWith('/(tabs)');

    await fireEvent.press(
      view.getByRole('button', { name: 'I need to leave on time' })
    );
    await fireEvent.press(
      view.getByRole('button', { name: 'Make a leave-on-time plan' })
    );
    expect(mockedRouter.push).toHaveBeenCalledWith('/departure');

    await fireEvent.press(
      view.getByRole('button', { name: 'Spark feels too loud' })
    );
    await fireEvent.press(
      view.getByRole('button', { name: 'Quiet Spark until tomorrow' })
    );
    expect(value.updateSetting).toHaveBeenCalledWith(
      'quietUntil',
      endOfToday(new Date('2026-07-16T12:00:00.000Z'))
    );
  });

  it('limits a weekly plan to three habits and saves tomorrow support', async () => {
    const value = spark();
    mockedSpark.mockReturnValue(value);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const view = await render(<WeeklyResetScreen />);
    for (let index = 0; index < 4; index += 1) {
      await fireEvent.press(
        view.getByRole('button', { name: `✦ Habit ${index}` })
      );
    }
    expect(alert).toHaveBeenCalledWith(
      'Three habits selected',
      expect.stringContaining('up to three')
    );
    await fireEvent.changeText(
      view.getByPlaceholderText('A short note to future me…'),
      '  Tiny worked  '
    );
    await fireEvent.press(view.getByRole('button', { name: 'Home' }));
    await fireEvent.press(view.getByRole('button', { name: 'Tiny 0' }));
    await fireEvent.press(
      view.getByRole('button', { name: 'Save weekly plan' })
    );
    await waitFor(() => expect(value.saveWeeklyPlan).toHaveBeenCalled());
    expect(value.saveWeeklyPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        weekStart: '2026-07-13',
        selectedHabitIds: ['habit-0', 'habit-1', 'habit-2'],
        reflection: 'Tiny worked',
        tomorrowContext: 'home',
        tomorrowTinyHabitId: 'habit-0',
        createdAt: '2026-07-16T12:00:00.000Z'
      })
    );
    expect(mockedRouter.back).toHaveBeenCalled();
  });

  it('saves and exports one departure block with its selected routine', async () => {
    const routine = {
      id: 'leave',
      title: 'Leave routine',
      icon: '🚪',
      color: '#fff',
      createdAt: '2026-07-01T00:00:00.000Z',
      steps: [{ id: 'keys', title: 'Keys', estimateMinutes: 5, sortOrder: 0 }]
    };
    const value = spark({ routines: [routine] });
    mockedSpark.mockReturnValue(value);
    const view = await render(<DepartureScreen />);
    await fireEvent.press(
      view.getByRole('button', { name: '🚪 Leave routine' })
    );
    await fireEvent.press(
      view.getByRole('button', { name: 'Add this block to my calendar' })
    );
    await waitFor(() => expect(value.saveDeparturePlan).toHaveBeenCalled());
    expect(value.saveDeparturePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Leave the house',
        bufferMinutes: 15,
        routineId: 'leave',
        status: 'planned'
      })
    );
    expect(openCalendarExport).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Spark: Leave the house',
        notes: expect.stringContaining('Spark did not read your calendar')
      })
    );
  });

  it('starts and ends a neutral one-week personal experiment locally', async () => {
    const active = {
      id: 'active',
      kind: 'tiny_week' as const,
      habitId: 'habit-0',
      startedAt: '2026-07-09T12:00:00.000Z',
      endsAt: '2026-07-15T12:00:00.000Z',
      status: 'active' as const,
      baselineStart: '2026-07-02',
      baselineEnd: '2026-07-08',
      note: ''
    };
    const value = spark({ personalExperiments: [active] });
    mockedSpark.mockReturnValue(value);
    const view = await render(<ExperimentsScreen />);
    await fireEvent.press(
      view.getByRole('button', { name: 'Finish and keep this comparison' })
    );
    await waitFor(() =>
      expect(value.savePersonalExperiment).toHaveBeenCalledWith({
        ...active,
        status: 'complete'
      })
    );
    await fireEvent.press(view.getByRole('button', { name: '✦ Habit 1' }));
    await fireEvent.press(
      view.getByRole('button', { name: 'Try an afternoon reminder' })
    );
    await fireEvent.changeText(
      view.getByPlaceholderText('Maybe afternoons are less rushed…'),
      '  Notice energy  '
    );
    await fireEvent.press(
      view.getByRole('button', { name: 'Start for one week' })
    );
    await waitFor(() =>
      expect(value.savePersonalExperiment).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'afternoon_reminder',
          habitId: 'habit-1',
          startedAt: '2026-07-16T12:00:00.000Z',
          endsAt: '2026-07-23T12:00:00.000Z',
          baselineStart: '2026-07-09',
          baselineEnd: '2026-07-15',
          note: 'Notice energy'
        })
      )
    );
  });

  it('shares only deliberately selected wins as text or an image', async () => {
    const completions = habits.map((habit, index) => ({
      id: `completion-${index}`,
      habitId: habit.id,
      variantId: `tiny-${index}`,
      variantKind: 'tiny' as const,
      reward: 1,
      occurredAt: '2026-07-16T12:00:00.000Z',
      loggedAt: '2026-07-16T12:00:00.000Z',
      localDate: '2026-07-16',
      source: 'today' as const
    }));
    mockedSpark.mockReturnValue(spark({ completions }));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const view = await render(<ShareProgressScreen />);
    await fireEvent.press(view.getByText('✦ Tiny 0'));
    await fireEvent.press(
      view.getByRole('button', { name: 'Share as text' })
    );
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('• ✦ Tiny 0')
      })
    );
    expect(share.mock.calls[0]?.[0].message).toContain('Selected and shared from Spark');

    for (let index = 1; index < 6; index += 1) {
      await fireEvent.press(view.getByText(`✦ Tiny ${index}`));
    }
    expect(alert).toHaveBeenCalledWith(
      'Choose up to five',
      expect.stringContaining('up to five')
    );
    await fireEvent.press(view.getByRole('button', { name: 'Share image' }));
    await waitFor(() => expect(captureRef).toHaveBeenCalled());
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      'cache/progress.png',
      expect.objectContaining({ mimeType: 'image/png' })
    );
  });
});
