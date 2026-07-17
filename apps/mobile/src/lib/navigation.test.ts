import { router } from 'expo-router';
import { goBackOr } from './navigation';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn()
  }
}));

const mockedRouter = router as jest.Mocked<typeof router>;

describe('safe back navigation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns to the actual previous screen when history exists', () => {
    mockedRouter.canGoBack.mockReturnValue(true);
    goBackOr('/(tabs)');
    expect(mockedRouter.back).toHaveBeenCalled();
    expect(mockedRouter.replace).not.toHaveBeenCalled();
  });

  it('uses a meaningful fallback after a deep link or widget launch', () => {
    mockedRouter.canGoBack.mockReturnValue(false);
    goBackOr('/(tabs)/journey');
    expect(mockedRouter.replace).toHaveBeenCalledWith('/(tabs)/journey');
  });
});
