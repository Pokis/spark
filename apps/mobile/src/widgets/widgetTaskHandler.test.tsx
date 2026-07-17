import AsyncStorage from '@react-native-async-storage/async-storage';
import { widgetTaskHandler } from './widgetTaskHandler';
import {
  FOCUS_WIDGET_SNAPSHOT_KEY,
  WIDGET_SNAPSHOT_KEY
} from './widgetTaskHandler';
import { SparkCaptureWidget } from './SparkCaptureWidget';
import { SparkFocusWidget } from './SparkFocusWidget';
import { SparkTodayWidget } from './SparkTodayWidget';
import { SparkProgressWidget } from './SparkProgressWidget';
import { SparkToolkitWidget } from './SparkToolkitWidget';

jest.mock('react-native-android-widget', () => ({
  FlexWidget: 'FlexWidget',
  TextWidget: 'TextWidget'
}));

function props(widgetName: string, widgetAction = 'WIDGET_UPDATE') {
  return {
    widgetInfo: { widgetName },
    widgetAction,
    renderWidget: jest.fn()
  } as any;
}

describe('native widget task routing', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('renders Capture only for a render-worthy lifecycle event', async () => {
    const update = props('SparkCapture');
    await widgetTaskHandler(update);
    expect(update.renderWidget.mock.calls[0][0].type).toBe(SparkCaptureWidget);
    const click = props('SparkCapture', 'WIDGET_CLICK');
    await widgetTaskHandler(click);
    expect(click.renderWidget).not.toHaveBeenCalled();
  });

  it('renders the static Toolkit and locally snapshotted Progress widgets', async () => {
    const toolkit = props('SparkToolkit', 'WIDGET_ADDED');
    await widgetTaskHandler(toolkit);
    expect(toolkit.renderWidget.mock.calls[0][0].type).toBe(SparkToolkitWidget);

    await AsyncStorage.setItem(
      WIDGET_SNAPSHOT_KEY,
      JSON.stringify({
        habitId: null,
        title: 'Enough for today',
        tinyLabel: 'Rest is allowed',
        winsToday: 2,
        totalWins: 18,
        totalSparks: 31,
        accent: '#20B8B2'
      })
    );
    const progress = props('SparkProgress', 'WIDGET_RESIZED');
    await widgetTaskHandler(progress);
    expect(progress.renderWidget.mock.calls[0][0].type).toBe(SparkProgressWidget);
    expect(progress.renderWidget.mock.calls[0][0].props.snapshot.totalWins).toBe(18);
  });

  it('loads persisted Focus state and falls back safely on malformed storage', async () => {
    await AsyncStorage.setItem(
      FOCUS_WIDGET_SNAPSHOT_KEY,
      JSON.stringify({
        session: null,
        syncedAt: '2026-07-16T00:00:00.000Z'
      })
    );
    const valid = props('SparkFocus', 'WIDGET_ADDED');
    await widgetTaskHandler(valid);
    expect(valid.renderWidget.mock.calls[0][0].type).toBe(SparkFocusWidget);
    expect(valid.renderWidget.mock.calls[0][0].props.snapshot.syncedAt).toBe(
      '2026-07-16T00:00:00.000Z'
    );

    await AsyncStorage.setItem(FOCUS_WIDGET_SNAPSHOT_KEY, '{broken');
    const broken = props('SparkFocus', 'WIDGET_RESIZED');
    await widgetTaskHandler(broken);
    expect(broken.renderWidget.mock.calls[0][0].props.snapshot.session).toBeNull();
  });

  it('loads persisted Today state and ignores unknown widgets/actions', async () => {
    await AsyncStorage.setItem(
      WIDGET_SNAPSHOT_KEY,
      JSON.stringify({
        habitId: 'habit',
        title: 'Read',
        tinyLabel: 'One line',
        winsToday: 1,
        accent: '#fff',
        brandMark: '✦'
      })
    );
    const today = props('SparkToday');
    await widgetTaskHandler(today);
    expect(today.renderWidget.mock.calls[0][0].type).toBe(SparkTodayWidget);
    expect(today.renderWidget.mock.calls[0][0].props.snapshot.habitId).toBe(
      'habit'
    );
    const unknown = props('Unknown');
    await widgetTaskHandler(unknown);
    expect(unknown.renderWidget).not.toHaveBeenCalled();
    const click = props('SparkToday', 'WIDGET_CLICK');
    await widgetTaskHandler(click);
    expect(click.renderWidget).not.toHaveBeenCalled();
  });
});
