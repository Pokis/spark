import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import FeaturesScreen from '../../app/features';
import { HabitEditor } from '../components/HabitEditor';
import { defaultSettings } from '../data/models';
import { useSpark } from '../state/SparkProvider';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() }
}));

jest.mock('../state/SparkProvider', () => ({ useSpark: jest.fn() }));

jest.mock('../hooks/useLocalDraft', () => ({
  useLocalDraft: jest.fn(() => jest.fn(async () => undefined))
}));

const mockedSpark = useSpark as jest.MockedFunction<typeof useSpark>;
const mockedRouter = router as jest.Mocked<typeof router>;

function spark() {
  return {
    habits: [],
    settings: { ...defaultSettings },
    timeZone: 'Europe/Vilnius',
    saveHabit: jest.fn(async () => undefined),
    updateSetting: jest.fn(async () => undefined)
  } as any;
}

describe('minimal habit setup and optional features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-20T09:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('requires a frequency and saves a yes-or-no habit with one action', async () => {
    const value = spark();
    mockedSpark.mockReturnValue(value);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onSaved = jest.fn();
    const view = await render(<HabitEditor onSaved={onSaved} />);

    expect(view.getByText('Only the name and frequency are required.')).toBeTruthy();
    expect(view.queryByText('Action sizes')).toBeNull();
    await fireEvent.changeText(view.getByTestId('habit-title'), 'Take vitamins');
    await fireEvent.press(view.getByTestId('save-habit'));
    expect(alert).toHaveBeenCalledWith(
      'Choose how often',
      'Select when this habit should appear.'
    );

    await fireEvent.press(view.getByRole('radio', { name: 'Times each week' }));
    await fireEvent.changeText(view.getByDisplayValue('3'), '2');
    await fireEvent.press(view.getByTestId('save-habit'));

    await waitFor(() => expect(value.saveHabit).toHaveBeenCalledTimes(1));
    expect(value.saveHabit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Take vitamins',
        schedule: { type: 'timesPerWeek', count: 2 },
        variants: [expect.objectContaining({ kind: 'standard', label: 'Take vitamins' })]
      })
    );
    expect(value.updateSetting).not.toHaveBeenCalledWith('actionSizesEnabled', true);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('keeps every extra off until the user explicitly enables it and links its tutorial', async () => {
    const value = spark();
    mockedSpark.mockReturnValue(value);
    const view = await render(<FeaturesScreen />);

    expect(view.getByText('0 of 9 extras enabled')).toBeTruthy();
    const sizes = view.getByLabelText('Different action sizes');
    expect(sizes.props.value).toBe(false);
    await fireEvent(sizes, 'valueChange', true);
    expect(value.updateSetting).toHaveBeenCalledWith('actionSizesEnabled', true);

    const tutorialButtons = view.getAllByRole('button', { name: 'How this works' });
    await fireEvent.press(tutorialButtons[0]!);
    expect(mockedRouter.push).toHaveBeenCalledWith('/tutorials?topic=habits-and-sizes');
  });
});
