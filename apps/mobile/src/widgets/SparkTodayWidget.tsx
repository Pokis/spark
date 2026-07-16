'use no memo';

import {
  FlexWidget,
  TextWidget
} from 'react-native-android-widget';

export interface SparkWidgetSnapshot {
  habitId: string | null;
  title: string;
  tinyLabel: string;
  winsToday: number;
  accent: string;
  brandMark?: string;
}

export const emptyWidgetSnapshot: SparkWidgetSnapshot = {
  habitId: null,
  title: 'Open Spark',
  tinyLabel: 'Choose one gentle next action',
  winsToday: 0,
  accent: '#FF6B5F'
};

export function widgetActionUri(habitId: string | null): string {
  return habitId
    ? `spark://widget-action?habitId=${encodeURIComponent(habitId)}`
    : 'spark://';
}

export function SparkTodayWidget({ snapshot }: { snapshot: SparkWidgetSnapshot }) {
  const uri = widgetActionUri(snapshot.habitId);
  return (
    <FlexWidget
      accessibilityLabel={`${snapshot.title}. ${snapshot.tinyLabel}. ${snapshot.winsToday} wins today. Tap to open Spark.`}
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        borderRadius: 24,
        backgroundColor: '#0B1020',
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <TextWidget
          text={`${snapshot.brandMark ?? '✦'}  SPARK`}
          style={{
            color: snapshot.accent as `#${string}`,
            fontSize: 13,
            fontWeight: '700'
          }}
        />
        <TextWidget
          text={`${snapshot.winsToday} win${snapshot.winsToday === 1 ? '' : 's'}`}
          style={{
            color: '#A8B0C4',
            fontSize: 12
          }}
        />
      </FlexWidget>
      <TextWidget
        text={snapshot.title}
        maxLines={1}
        style={{
          color: '#FFFFFF',
          fontSize: 20,
          fontWeight: '700'
        }}
      />
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <TextWidget
          text={snapshot.tinyLabel}
          maxLines={1}
          style={{
            color: '#D7DCEC',
            fontSize: 13,
            width: 200
          }}
        />
        <TextWidget
          text={snapshot.habitId ? 'LOG TINY  ›' : 'OPEN  ›'}
          style={{
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '700',
            backgroundColor: snapshot.accent as `#${string}`,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 7
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
