import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import { AppState, Platform, Text } from 'react-native';
import { useSpark } from '../state/SparkProvider';
import { PrivacyGate } from './PrivacyGate';

jest.mock('../state/SparkProvider', () => ({
  useSpark: jest.fn()
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn()
}));

jest.mock('expo-screen-capture', () => ({
  enableAppSwitcherProtectionAsync: jest.fn(async () => undefined),
  disableAppSwitcherProtectionAsync: jest.fn(async () => undefined),
  preventScreenCaptureAsync: jest.fn(async () => undefined),
  allowScreenCaptureAsync: jest.fn(async () => undefined)
}));

const mockedSpark = useSpark as jest.MockedFunction<typeof useSpark>;

function spark(overrides: Record<string, unknown> = {}) {
  return {
    loading: false,
    settings: {
      appLockEnabled: false,
      appLockTimeoutMinutes: 1,
      hideSensitiveAppPreview: false,
      ...overrides
    },
    updateSetting: jest.fn(async () => undefined)
  } as any;
}

describe('PrivacyGate', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android'
    });
    (
      LocalAuthentication.hasHardwareAsync as jest.MockedFunction<
        typeof LocalAuthentication.hasHardwareAsync
      >
    ).mockResolvedValue(true);
    (
      LocalAuthentication.isEnrolledAsync as jest.MockedFunction<
        typeof LocalAuthentication.isEnrolledAsync
      >
    ).mockResolvedValue(true);
    (
      LocalAuthentication.authenticateAsync as jest.MockedFunction<
        typeof LocalAuthentication.authenticateAsync
      >
    ).mockResolvedValue({ success: true } as never);
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform
    });
  });

  it('shows content directly when app lock is off', async () => {
    mockedSpark.mockReturnValue(spark());
    const view = await render(
      <PrivacyGate>
        <Text>Private content</Text>
      </PrivacyGate>
    );
    expect(await view.findByText('Private content')).toBeTruthy();
  });

  it('requires enrolled device authentication and unlocks locally', async () => {
    mockedSpark.mockReturnValue(spark({ appLockEnabled: true }));
    const view = await render(
      <PrivacyGate>
        <Text>Private content</Text>
      </PrivacyGate>
    );
    expect(await view.findByText('✦ Spark is locked')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Unlock Spark' }));
    expect(await view.findByText('Private content')).toBeTruthy();
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ disableDeviceFallback: false })
    );
  });

  it('disables a restored lock rather than trapping a device without enrollment', async () => {
    (
      LocalAuthentication.isEnrolledAsync as jest.MockedFunction<
        typeof LocalAuthentication.isEnrolledAsync
      >
    ).mockResolvedValue(false);
    const value = spark({ appLockEnabled: true });
    mockedSpark.mockReturnValue(value);
    const view = await render(
      <PrivacyGate>
        <Text>Private content</Text>
      </PrivacyGate>
    );
    expect(await view.findByText('Private content')).toBeTruthy();
    expect(value.updateSetting).toHaveBeenCalledWith('appLockEnabled', false);
  });

  it('also fails open safely when capability detection itself rejects', async () => {
    (
      LocalAuthentication.hasHardwareAsync as jest.MockedFunction<
        typeof LocalAuthentication.hasHardwareAsync
      >
    ).mockRejectedValue(new Error('native unavailable'));
    const value = spark({ appLockEnabled: true });
    mockedSpark.mockReturnValue(value);
    const view = await render(
      <PrivacyGate>
        <Text>Private content</Text>
      </PrivacyGate>
    );
    expect(await view.findByText('Private content')).toBeTruthy();
    expect(value.updateSetting).toHaveBeenCalledWith('appLockEnabled', false);
  });

  it('protects Android screenshots and iOS app-switcher previews only when enabled', async () => {
    mockedSpark.mockReturnValue(spark({ hideSensitiveAppPreview: true }));
    const android = await render(
      <PrivacyGate>
        <Text>Private content</Text>
      </PrivacyGate>
    );
    await waitFor(() =>
      expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledWith(
        'spark-sensitive-preview'
      )
    );
    await android.unmount();
    await waitFor(() =>
      expect(ScreenCapture.allowScreenCaptureAsync).toHaveBeenCalled()
    );

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios'
    });
    mockedSpark.mockReturnValue(spark({ hideSensitiveAppPreview: true }));
    const ios = await render(
      <PrivacyGate>
        <Text>Private content</Text>
      </PrivacyGate>
    );
    await waitFor(() =>
      expect(
        ScreenCapture.enableAppSwitcherProtectionAsync
      ).toHaveBeenCalledWith(0.7)
    );
    await ios.unmount();
    await waitFor(() =>
      expect(ScreenCapture.disableAppSwitcherProtectionAsync).toHaveBeenCalled()
    );
  });

  it('relocks after the configured background timeout', async () => {
    let listener: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(
      (_event, callback) => {
        listener = callback as (state: string) => void;
        return { remove: jest.fn() } as never;
      }
    );
    mockedSpark.mockReturnValue(
      spark({ appLockEnabled: true, appLockTimeoutMinutes: 0 })
    );
    const view = await render(
      <PrivacyGate>
        <Text>Private content</Text>
      </PrivacyGate>
    );
    await view.findByText('✦ Spark is locked');
    await fireEvent.press(view.getByRole('button', { name: 'Unlock Spark' }));
    await view.findByText('Private content');
    await act(async () => {
      listener?.('background');
      listener?.('active');
    });
    expect(await view.findByText('✦ Spark is locked')).toBeTruthy();
  });
});
