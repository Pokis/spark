import { defaultAppConfig } from '@spark/cloud-contracts';
import Constants from 'expo-constants';
import Storage from 'expo-sqlite/kv-store';
import { loadAppConfig, remoteConfigConfigured } from './cloudConfig';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        sparkApiUrl: 'https://spark.example.test',
        sparkRemoteConfigEnabled: false
      }
    }
  }
}));

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn()
  }
}));

describe('cloud cost controls', () => {
  const getItem = Storage.getItem as jest.MockedFunction<typeof Storage.getItem>;

  beforeEach(() => {
    jest.clearAllMocks();
    (Constants.expoConfig!.extra as Record<string, unknown>).sparkRemoteConfigEnabled = false;
  });

  it('uses baked all-off defaults without reading cache when remote config is disabled', async () => {
    getItem.mockResolvedValue(
      JSON.stringify({
        ...defaultAppConfig,
        defaults: {
          ...defaultAppConfig.defaults,
          supportEnabled: true,
          purchasesEnabled: true
        }
      })
    );

    expect(remoteConfigConfigured()).toBe(false);
    await expect(loadAppConfig()).resolves.toEqual(defaultAppConfig);
    expect(getItem).not.toHaveBeenCalled();
  });

  it('uses the bounded local cache only after the build flag is enabled', async () => {
    (Constants.expoConfig!.extra as Record<string, unknown>).sparkRemoteConfigEnabled = true;
    const cached = {
      ...defaultAppConfig,
      updatedAt: '2026-07-16T12:00:00.000Z',
      defaults: {
        ...defaultAppConfig.defaults,
        supportEnabled: true
      }
    };
    getItem.mockImplementation(async (key) =>
      key.includes('checked-at') ? String(Date.now()) : JSON.stringify(cached)
    );

    expect(remoteConfigConfigured()).toBe(true);
    await expect(loadAppConfig()).resolves.toEqual(cached);
  });
});
