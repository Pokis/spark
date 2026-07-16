import { render, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams } from 'expo-router';
import { useSpark } from '../state/SparkProvider';
import FocusWidgetActionScreen from '../../app/focus-widget-action';
import { reportError } from '../services/diagnostics';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  Redirect: ({ href }: { href: string }) => {
    const ReactNative = require('react-native');
    return <ReactNative.Text>Redirect:{href}</ReactNative.Text>;
  }
}));

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval'
  },
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn()
}));

jest.mock('../state/SparkProvider', () => ({
  useSpark: jest.fn()
}));

jest.mock('../services/diagnostics', () => ({
  reportError: jest.fn(async () => undefined)
}));

const params = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;
const mockedSpark = useSpark as jest.MockedFunction<typeof useSpark>;

const session = {
  id: 'focus',
  title: 'Open document',
  plannedSeconds: 600,
  startedAt: '2026-07-16T10:00:00.000Z',
  endedAt: null,
  pausedAt: null,
  pausedSeconds: 0,
  completed: false,
  interruptionCount: 0
};

describe('Focus widget actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-16T10:02:00.000Z'));
    (
      Notifications.getAllScheduledNotificationsAsync as jest.Mock
    ).mockResolvedValue([
        {
          identifier: 'target',
          content: {
            data: { sparkNotificationType: 'focus', focusSessionId: 'focus' }
          }
        },
        {
          identifier: 'other',
          content: {
            data: { sparkNotificationType: 'focus', focusSessionId: 'other' }
          }
        }
      ] as never);
    (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(
      undefined
    );
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(
      'notification'
    );
  });

  afterEach(() => jest.useRealTimers());

  it('pauses the persisted session and cancels only its completion alert', async () => {
    params.mockReturnValue({ action: 'pause', sessionId: 'focus' } as never);
    const value = {
      loading: false,
      focusSessions: [session],
      saveFocus: jest.fn(async () => undefined)
    } as any;
    mockedSpark.mockReturnValue(value);
    const view = await render(<FocusWidgetActionScreen />);
    await view.findByText('Redirect:/(tabs)/focus');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'target'
    );
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith(
      'other'
    );
    expect(value.saveFocus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'focus',
        pausedAt: '2026-07-16T10:02:00.000Z'
      })
    );
  });

  it('resumes from timestamps, persists accumulated pause time, and reschedules', async () => {
    params.mockReturnValue({ action: 'resume', sessionId: 'focus' } as never);
    const value = {
      loading: false,
      focusSessions: [
        {
          ...session,
          pausedAt: '2026-07-16T10:01:00.000Z',
          pausedSeconds: 30
        }
      ],
      saveFocus: jest.fn(async () => undefined)
    } as any;
    mockedSpark.mockReturnValue(value);
    const view = await render(<FocusWidgetActionScreen />);
    await view.findByText('Redirect:/(tabs)/focus');
    expect(value.saveFocus).toHaveBeenCalledWith(
      expect.objectContaining({ pausedAt: null, pausedSeconds: 90 })
    );
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          data: { sparkNotificationType: 'focus', focusSessionId: 'focus' }
        }),
        trigger: expect.objectContaining({ seconds: 570 })
      })
    );
  });

  it('redirects safely for missing sessions and records native failures', async () => {
    params.mockReturnValue({ action: 'pause', sessionId: 'missing' } as never);
    mockedSpark.mockReturnValue({
      loading: false,
      focusSessions: [],
      saveFocus: jest.fn()
    } as any);
    const missing = await render(<FocusWidgetActionScreen />);
    expect(await missing.findByText('Redirect:/(tabs)/focus')).toBeTruthy();
    await missing.unmount();

    params.mockReturnValue({ action: 'pause', sessionId: 'focus' } as never);
    (
      Notifications.getAllScheduledNotificationsAsync as jest.MockedFunction<
        typeof Notifications.getAllScheduledNotificationsAsync
      >
    ).mockRejectedValueOnce(new Error('native failure'));
    mockedSpark.mockReturnValue({
      loading: false,
      focusSessions: [session],
      saveFocus: jest.fn()
    } as any);
    const failed = await render(<FocusWidgetActionScreen />);
    await failed.findByText('Redirect:/(tabs)/focus');
    await waitFor(() =>
      expect(reportError).toHaveBeenCalledWith(
        'focus.widget_action',
        expect.any(Error)
      )
    );
  });
});
