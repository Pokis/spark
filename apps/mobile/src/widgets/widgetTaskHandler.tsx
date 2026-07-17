import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import {
  emptyWidgetSnapshot,
  SparkTodayWidget,
  type SparkWidgetSnapshot
} from './SparkTodayWidget';
import { SparkCaptureWidget } from './SparkCaptureWidget';
import {
  emptyFocusSnapshot,
  SparkFocusWidget,
  type SparkFocusSnapshot
} from './SparkFocusWidget';
import { SparkProgressWidget } from './SparkProgressWidget';
import { SparkToolkitWidget } from './SparkToolkitWidget';

export const WIDGET_SNAPSHOT_KEY = 'spark.widget.snapshot.v1';
export const FOCUS_WIDGET_SNAPSHOT_KEY = 'spark.focus-widget.snapshot.v1';

async function snapshot(): Promise<SparkWidgetSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as SparkWidgetSnapshot) : emptyWidgetSnapshot;
  } catch {
    return emptyWidgetSnapshot;
  }
}

async function focusSnapshot(): Promise<SparkFocusSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(FOCUS_WIDGET_SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as SparkFocusSnapshot) : emptyFocusSnapshot;
  } catch {
    return emptyFocusSnapshot;
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName === 'SparkToolkit') {
    if (
      props.widgetAction === 'WIDGET_ADDED' ||
      props.widgetAction === 'WIDGET_UPDATE' ||
      props.widgetAction === 'WIDGET_RESIZED'
    ) {
      props.renderWidget(<SparkToolkitWidget />);
    }
    return;
  }
  if (props.widgetInfo.widgetName === 'SparkProgress') {
    if (
      props.widgetAction === 'WIDGET_ADDED' ||
      props.widgetAction === 'WIDGET_UPDATE' ||
      props.widgetAction === 'WIDGET_RESIZED'
    ) {
      props.renderWidget(<SparkProgressWidget snapshot={await snapshot()} />);
    }
    return;
  }
  if (props.widgetInfo.widgetName === 'SparkCapture') {
    if (
      props.widgetAction === 'WIDGET_ADDED' ||
      props.widgetAction === 'WIDGET_UPDATE' ||
      props.widgetAction === 'WIDGET_RESIZED'
    ) {
      props.renderWidget(<SparkCaptureWidget />);
    }
    return;
  }
  if (props.widgetInfo.widgetName === 'SparkFocus') {
    if (
      props.widgetAction === 'WIDGET_ADDED' ||
      props.widgetAction === 'WIDGET_UPDATE' ||
      props.widgetAction === 'WIDGET_RESIZED'
    ) {
      props.renderWidget(<SparkFocusWidget snapshot={await focusSnapshot()} />);
    }
    return;
  }
  if (props.widgetInfo.widgetName !== 'SparkToday') return;
  if (
    props.widgetAction === 'WIDGET_ADDED' ||
    props.widgetAction === 'WIDGET_UPDATE' ||
    props.widgetAction === 'WIDGET_RESIZED'
  ) {
    props.renderWidget(<SparkTodayWidget snapshot={await snapshot()} />);
  }
}
