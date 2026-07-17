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

    expect(view.getByText('Personal experiments')).toBeTruthy();
    expect(view.getByText('Home-screen widgets')).toBeTruthy();
    await fireEvent.press(
      view.getByRole('button', { name: 'Open tutorial: Personal experiments' })
    );
    expect(view.getByText('Ask a small question')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Skip for now' }));
    expect(view.getByText('Feature tutorials')).toBeTruthy();
    expect(value.updateSetting).not.toHaveBeenCalled();
  });

  it('opens a requested topic, supports progress, and dismisses its contextual prompt', async () => {
    const value = spark();
    mockedSpark.mockReturnValue(value);
    mockedParams.mockReturnValue({ topic: 'experiments' });
    const view = await render(<TutorialsScreen />);

    await fireEvent.press(view.getByRole('button', { name: 'Next' }));
    expect(view.getByText('Spark does not experiment on you')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Dismiss this tip' }));
    await waitFor(() =>
      expect(value.updateSetting).toHaveBeenCalledWith('dismissedTutorialIds', ['experiments'])
    );
    expect(view.getByRole('button', { name: 'Open tutorial: Personal experiments' })).toBeTruthy();
  });

  it('always offers replay and can restore contextual tips', async () => {
    const value = spark(['widgets']);
    mockedSpark.mockReturnValue(value);
    const view = await render(<TutorialsScreen />);
    expect(view.getByRole('button', { name: 'Replay tutorial: Home-screen widgets' })).toBeTruthy();
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
    await fireEvent.press(view.getByRole('button', { name: 'Open personal experiments' }));
    await waitFor(() => expect(mockedRouter.push).toHaveBeenCalledWith('/experiments'));
    expect(value.updateSetting).toHaveBeenCalledWith('dismissedTutorialIds', ['experiments']);
  });
});
