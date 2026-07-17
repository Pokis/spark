'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface SparkRoutineSnapshot {
  routineId: string | null;
  title: string;
  icon: string;
  currentStep: string;
  stepNumber: number;
  stepCount: number;
  paused: boolean;
}

export const emptyRoutineSnapshot: SparkRoutineSnapshot = {
  routineId: null,
  title: 'Create a routine',
  icon: '🧩',
  currentStep: 'Keep one step visible at a time',
  stepNumber: 0,
  stepCount: 0,
  paused: false
};

export function routineWidgetUri(routineId: string | null): string {
  return routineId
    ? `spark://routine/${encodeURIComponent(routineId)}`
    : 'spark://routine/new';
}

export function SparkRoutineWidget({ snapshot }: { snapshot: SparkRoutineSnapshot }) {
  const action = snapshot.routineId
    ? snapshot.paused
      ? 'RESUME  ▶'
      : 'OPEN  ›'
    : 'CREATE  ＋';
  return (
    <FlexWidget
      accessibilityLabel={
        snapshot.routineId
          ? `${snapshot.title}. Step ${snapshot.stepNumber} of ${snapshot.stepCount}: ${snapshot.currentStep}. ${snapshot.paused ? 'Paused; tap to resume.' : 'Tap to open.'}`
          : 'Create a routine to show its next step here.'
      }
      clickAction="OPEN_URI"
      clickActionData={{ uri: routineWidgetUri(snapshot.routineId) }}
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
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
        <TextWidget text={`${snapshot.icon}  ROUTINE`} style={{ color: '#8367E8', fontSize: 12, fontWeight: '700' }} />
        {snapshot.stepCount ? (
          <TextWidget text={`${snapshot.stepNumber}/${snapshot.stepCount}`} style={{ color: '#A8B0C4', fontSize: 12 }} />
        ) : null}
      </FlexWidget>
      <TextWidget text={snapshot.title} maxLines={1} style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '700' }} />
      <TextWidget text={snapshot.currentStep} maxLines={1} style={{ color: '#D7DCEC', fontSize: 13 }} />
      <TextWidget text={action} style={{ color: '#FFC857', fontSize: 12, fontWeight: '700' }} />
    </FlexWidget>
  );
}
