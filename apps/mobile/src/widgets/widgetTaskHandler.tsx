import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import {
  emptyWidgetSnapshot,
  SparkTodayWidget,
  type SparkWidgetSnapshot
} from './SparkTodayWidget';

export const WIDGET_SNAPSHOT_KEY = 'spark.widget.snapshot.v1';

async function snapshot(): Promise<SparkWidgetSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as SparkWidgetSnapshot) : emptyWidgetSnapshot;
  } catch {
    return emptyWidgetSnapshot;
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== 'SparkToday') return;
  if (
    props.widgetAction === 'WIDGET_ADDED' ||
    props.widgetAction === 'WIDGET_UPDATE' ||
    props.widgetAction === 'WIDGET_RESIZED'
  ) {
    props.renderWidget(<SparkTodayWidget snapshot={await snapshot()} />);
  }
}
