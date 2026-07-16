import type { FocusSession } from '@spark/domain';
import * as Notifications from 'expo-notifications';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { LoadingState } from '../src/components/LoadingState';
import { useSpark } from '../src/state/SparkProvider';
import { focusRemainingSeconds } from '../src/widgets/SparkFocusWidget';
import { reportError } from '../src/services/diagnostics';

async function cancelFocusNotifications(sessionId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(
        (notification) =>
          notification.content.data?.sparkNotificationType === 'focus' &&
          notification.content.data?.focusSessionId === sessionId
      )
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      )
  );
}

async function scheduleResumeNotification(session: FocusSession): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Focus session complete ✦',
      body: 'You came back to the task.',
      data: { sparkNotificationType: 'focus', focusSessionId: session.id },
      sound: false
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, focusRemainingSeconds(session))
    }
  });
}

export default function FocusWidgetActionScreen() {
  const { action, sessionId } = useLocalSearchParams<{
    action?: 'pause' | 'resume' | 'open';
    sessionId?: string;
  }>();
  const spark = useSpark();
  const handled = useRef(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (spark.loading || handled.current || !sessionId) return;
    handled.current = true;
    const session = spark.focusSessions.find(
      (candidate) => candidate.id === sessionId && !candidate.endedAt
    );
    if (!session) {
      setDone(true);
      return;
    }
    void (async () => {
      try {
        if (action === 'pause' && !session.pausedAt) {
          await cancelFocusNotifications(session.id);
          await spark.saveFocus({ ...session, pausedAt: new Date().toISOString() });
        } else if (action === 'resume' && session.pausedAt) {
          const now = Date.now();
          const resumed: FocusSession = {
            ...session,
            pausedSeconds:
              session.pausedSeconds +
              Math.max(0, Math.round((now - Date.parse(session.pausedAt)) / 1000)),
            pausedAt: null
          };
          await cancelFocusNotifications(session.id);
          await spark.saveFocus(resumed);
          await scheduleResumeNotification(resumed);
        }
      } catch (reason) {
        await reportError('focus.widget_action', reason);
      } finally {
        setDone(true);
      }
    })();
  }, [action, sessionId, spark]);

  if (spark.loading || !done) return <LoadingState />;
  return <Redirect href="/(tabs)/focus" />;
}
