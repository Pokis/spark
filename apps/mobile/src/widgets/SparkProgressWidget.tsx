'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { SparkWidgetSnapshot } from './SparkTodayWidget';

export function SparkProgressWidget({ snapshot }: { snapshot: SparkWidgetSnapshot }) {
  const totalWins = snapshot.totalWins ?? snapshot.winsToday;
  const totalSparks = snapshot.totalSparks ?? 0;
  return (
    <FlexWidget
      accessibilityLabel={`${totalWins} total wins and ${totalSparks} Spark points. Tap to review progress.`}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'spark://journey' }}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        borderRadius: 22,
        backgroundColor: '#0B1020',
        padding: 16,
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <TextWidget text={`${snapshot.brandMark ?? '✦'}  PROGRESS`} style={{ color: '#20B8B2', fontSize: 12, fontWeight: '700' }} />
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text={String(totalWins)} style={{ color: '#FFFFFF', fontSize: 27, fontWeight: '700' }} />
          <TextWidget text="wins kept" style={{ color: '#A8B0C4', fontSize: 12 }} />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          <TextWidget text={String(totalSparks)} style={{ color: '#FFC857', fontSize: 23, fontWeight: '700' }} />
          <TextWidget text="Spark points" style={{ color: '#A8B0C4', fontSize: 12 }} />
        </FlexWidget>
      </FlexWidget>
      <TextWidget text={`${snapshot.winsToday} today · REVIEW  ›`} style={{ color: '#D7DCEC', fontSize: 12, fontWeight: '700' }} />
    </FlexWidget>
  );
}
