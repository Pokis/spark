'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { FocusSession } from '@spark/domain';

export interface SparkFocusSnapshot {
  session: FocusSession | null;
  syncedAt: string;
}

export const emptyFocusSnapshot: SparkFocusSnapshot = {
  session: null,
  syncedAt: new Date(0).toISOString()
};

export function focusRemainingSeconds(session: FocusSession, now = Date.now()): number {
  const effectiveNow = session.pausedAt ? Date.parse(session.pausedAt) : now;
  const elapsed =
    effectiveNow - Date.parse(session.startedAt) - session.pausedSeconds * 1000;
  return Math.max(0, Math.ceil((session.plannedSeconds * 1000 - elapsed) / 1000));
}

function minuteLabel(seconds: number): string {
  if (seconds < 60) return '<1 min';
  return `${Math.ceil(seconds / 60)} min`;
}

export function SparkFocusWidget({ snapshot }: { snapshot: SparkFocusSnapshot }) {
  const session = snapshot.session;
  if (!session || session.endedAt) {
    return (
      <FlexWidget
        accessibilityLabel="No focus session running. Start a two minute focus session."
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'spark://focus-launch?minutes=2' }}
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
        <TextWidget text="✦  FOCUS" style={{ color: '#8367E8', fontSize: 12, fontWeight: '700' }} />
        <TextWidget text="Start beside me" style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '700' }} />
        <TextWidget text="2 MIN LAUNCH  ›" style={{ color: '#D7DCEC', fontSize: 12, fontWeight: '700' }} />
      </FlexWidget>
    );
  }
  const paused = Boolean(session.pausedAt);
  const remaining = focusRemainingSeconds(session);
  const finished = remaining === 0;
  const action = finished ? 'open' : paused ? 'resume' : 'pause';
  return (
    <FlexWidget
      accessibilityLabel={`${session.title}. ${
        finished ? 'Timer complete' : `${minuteLabel(remaining)} remaining`
      }. ${finished ? 'Open Spark to close the session' : paused ? 'Paused' : 'Running'}.`}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'spark://(tabs)/focus' }}
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
        <TextWidget text={finished ? 'FOCUS · COMPLETE' : paused ? 'FOCUS · PAUSED' : 'FOCUS · RUNNING'} style={{ color: '#A8B0C4', fontSize: 11, fontWeight: '700' }} />
        <TextWidget text={finished ? 'Ready' : minuteLabel(remaining)} style={{ color: '#FFC857', fontSize: 13, fontWeight: '700' }} />
      </FlexWidget>
      <TextWidget text={session.title} maxLines={1} style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '700' }} />
      <TextWidget
        text={finished ? 'OPEN  ›' : paused ? 'RESUME  ▶' : 'PAUSE  Ⅱ'}
        clickAction="OPEN_URI"
        clickActionData={{
          uri: `spark://focus-widget-action?action=${action}&sessionId=${encodeURIComponent(session.id)}`
        }}
        style={{
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: '700',
          backgroundColor: '#8367E8',
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8
        }}
      />
    </FlexWidget>
  );
}
