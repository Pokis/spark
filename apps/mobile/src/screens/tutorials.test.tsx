import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { defaultAppConfig } from '@spark/cloud-contracts';
import { router, useLocalSearchParams } from 'expo-router';
import TutorialsScreen from '../../app/tutorials';
import { defaultSettings } from '../data/models';
import { useSpark } from '../state/SparkProvider';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({}))
}));

jest.mock('../state/SparkProvider', () => ({ useSpark: jest.fn() }));

const mockedSpark = useSpark as jest.MockedFunction<typeof useSpark>;
const mockedParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;
const mockedRouter = router as jest.Mocked<typeof router>;

function spark(dismissedTutorialIds: string[] = []) {
  return {
    settings: { ...defaultSettings, dismissedTutorialIds },
    remoteConfig: defaultAppConfig,
    updateSetting: jest.fn(async () => undefined)
  } as any;
}

describe('feature tutorial hub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedParams.mockReturnValue({});
  });

  it('discovers hidden features and lets a tutorial be skipped without dismissing it', async () => {
    const value = spark();
    mockedSpark.mockReturnValue(value);
    const view = await render(<TutorialsScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'Expand Planning & progress' }));
    expect(view.getByText('Try a change for a week')).toBeTruthy();
    await fireEvent.press(
      view.getByRole('button', { name: 'Open guide: Try a change for a week' })
    );
    expect(view.getByText('Ask a small question')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Close this guide' }));
    expect(view.getByText('Learn how features work')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Collapse Planning & progress' })).toBeTruthy();
    expect(view.getByText('Try a change for a week')).toBeTruthy();
    expect(value.updateSetting).not.toHaveBeenCalled();
  });

  it('opens a requested topic, supports progress, and dismisses its contextual prompt', async () => {
    const value = spark();
    mockedSpark.mockReturnValue(value);
    mockedParams.mockReturnValue({ topic: 'experiments' });
    const view = await render(<TutorialsScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'Next' }));
    expect(view.getByText('Choose the exact change')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Don’t show this tip again' }));
    await waitFor(() =>
      expect(value.updateSetting).toHaveBeenCalledWith('dismissedTutorialIds', ['experiments'])
    );
    await fireEvent.press(view.getByRole('button', { name: 'Expand Planning & progress' }));
    expect(view.getByRole('button', { name: 'Open guide: Try a change for a week' })).toBeTruthy();
  });

  it('always offers replay and can restore contextual tips', async () => {
    const value = spark(['widgets']);
    mockedSpark.mockReturnValue(value);
    const view = await render(<TutorialsScreen />);
    await fireEvent.press(view.getByRole('button', { name: 'Expand Widgets, reminders & privacy' }));
    await fireEvent.press(view.getByRole('button', { name: 'Replay guide: Home-screen widgets' }));
    await fireEvent.press(view.getByRole('button', { name: 'Next' }));
    await fireEvent.press(view.getByRole('button', { name: 'Next' }));
    expect(view.getByText('Refreshes are intentionally light')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Next' })).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Done' }));
    expect(view.getByRole('button', { name: 'Replay guide: Home-screen widgets' })).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Restore all contextual tips' }));
    expect(value.updateSetting).toHaveBeenCalledWith('dismissedTutorialIds', []);
  });

  it('ends feature tutorials at the relevant tool instead of another menu search', async () => {
    const value = spark();
    mockedSpark.mockReturnValue(value);
    mockedParams.mockReturnValue({ topic: 'experiments' });
    const view = await render(<TutorialsScreen />);
    await fireEvent.press(view.getByRole('button', { name: 'Next' }));
    await fireEvent.press(view.getByRole('button', { name: 'Next' }));
    await fireEvent.press(view.getByRole('button', { name: 'Try a change' }));
    await waitFor(() => expect(mockedRouter.push).toHaveBeenCalledWith('/experiments'));
    expect(value.updateSetting).toHaveBeenCalledWith('dismissedTutorialIds', ['experiments']);
  });
});
