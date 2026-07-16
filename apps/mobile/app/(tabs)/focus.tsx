import type { FocusSession } from '@spark/domain';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useAudioPlayer } from 'expo-audio';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { FormField } from '../../src/components/FormField';
import { Screen } from '../../src/components/Screen';
import { Eyebrow, H1, Muted, SectionHeading } from '../../src/components/Typography';
import { friendlyTime, secondsLabel } from '../../src/lib/date';
import { createId } from '../../src/lib/id';
import { reportError } from '../../src/services/diagnostics';
import { ensureSoundscape } from '../../src/services/soundscapes';
import { useLocalDraft } from '../../src/hooks/useLocalDraft';
import { isQuietNow } from '../../src/lib/sensory';
import { useSpark } from '../../src/state/SparkProvider';
import { useTheme } from '../../src/theme';
import { openCalendarExport } from '../../src/services/calendarBridge';

type TimerPhase = 'idle' | 'running' | 'paused' | 'finished';

function Companion({
  active,
  reducedMotion,
  style
}: {
  active: boolean;
  reducedMotion: boolean;
  style: 'spark' | 'owl' | 'cloud';
}) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active || reducedMotion) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.96, duration: 2200, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [active, pulse, reducedMotion]);
  return (
    <View style={styles.companionArea}>
      <Animated.View
        accessibilityLabel={
          active ? 'Spark companion is focusing beside you' : 'Spark companion is waiting'
        }
        style={[
          styles.companion,
          { backgroundColor: theme.purple, transform: [{ scale: pulse }] }
        ]}
      >
        <Text style={styles.companionFace}>
          {style === 'owl' ? (active ? '◉ ᴗ ◉' : '◉ – ◉') : style === 'cloud' ? '☁' : active ? '• ᴗ •' : '• – •'}
        </Text>
        <View style={[styles.companionLaptop, { backgroundColor: theme.surfaceAlt }]} />
      </Animated.View>
      <Muted>{active ? 'I’m staying with you.' : 'Pick one small target.'}</Muted>
    </View>
  );
}

function remainingSeconds(session: FocusSession, now = Date.now()): number {
  const effectiveNow = session.pausedAt ? Date.parse(session.pausedAt) : now;
  const elapsed =
    effectiveNow -
    Date.parse(session.startedAt) -
    session.pausedSeconds * 1000;
  return Math.max(0, Math.ceil((session.plannedSeconds * 1000 - elapsed) / 1000));
}

async function cancelFocusNotification(sessionId?: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter(
          (notification) =>
            notification.content.data?.sparkNotificationType === 'focus' &&
            (!sessionId ||
              notification.content.data?.focusSessionId === sessionId)
        )
        .map((notification) =>
          Notifications.cancelScheduledNotificationAsync(notification.identifier)
        )
    );
  } catch (reason) {
    await reportError('focus.notification_cancel', reason);
  }
}

async function scheduleFocusNotification(
  session: FocusSession,
  seconds: number,
  resumed = false
): Promise<void> {
  try {
    await cancelFocusNotification(session.id);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Focus session complete ✦',
        body: resumed
          ? 'You came back to the task.'
          : 'Take a breath before choosing what is next.',
        data: {
          sparkNotificationType: 'focus',
          focusSessionId: session.id
        },
        sound: false
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, seconds)
      }
    });
  } catch (reason) {
    await reportError('focus.notification_schedule', reason);
  }
}

export default function FocusScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const params = useLocalSearchParams<{ title?: string; minutes?: string }>();
  const durationOptions = spark.remoteConfig.defaults.focusMinutes.length
    ? spark.remoteConfig.defaults.focusMinutes
    : [5, 10, 25, 50];
  const initialMinutes = Math.max(1, Number(params.minutes) || spark.settings.defaultFocusMinutes);
  const [minutes, setMinutes] = useState(initialMinutes);
  const [title, setTitle] = useState(params.title ?? '');
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [session, setSession] = useState<FocusSession | null>(null);
  const [remaining, setRemaining] = useState(minutes * 60);
  const [interruptionText, setInterruptionText] = useState('');
  const [launchCountdown, setLaunchCountdown] = useState<number | null>(null);
  const [nextMove, setNextMove] = useState('');
  const restored = useRef(false);
  const finishing = useRef(false);
  const soundPlayer = useAudioPlayer(null);
  const quietNow = isQuietNow(spark.settings);
  const clearDraft = useLocalDraft(
    'focus-idle',
    { title, minutes, interruptionText, nextMove },
    (draft) => {
      if (params.title || params.minutes) return;
      setTitle(draft.title);
      setMinutes(draft.minutes);
      setInterruptionText(draft.interruptionText);
      setNextMove(draft.nextMove);
    },
    phase === 'idle'
  );

  useEffect(() => {
    soundPlayer.loop = true;
    soundPlayer.volume = spark.settings.soundscapeVolume;
    if (
      phase !== 'running' ||
      !spark.entitlement.premium ||
      !spark.settings.soundscapeEnabled ||
      quietNow
    ) {
      soundPlayer.pause();
      return;
    }
    let active = true;
    void ensureSoundscape(spark.settings.soundscapeKind)
      .then((uri) => {
        if (!active) return;
        soundPlayer.replace({ uri });
        soundPlayer.loop = true;
        soundPlayer.volume = spark.settings.soundscapeVolume;
        soundPlayer.play();
      })
      .catch((reason: unknown) => reportError('focus.soundscape', reason));
    return () => {
      active = false;
      soundPlayer.pause();
    };
  }, [
    phase,
    soundPlayer,
    spark.entitlement.premium,
    spark.settings.soundscapeEnabled,
    spark.settings.soundscapeKind,
    spark.settings.soundscapeVolume
    ,quietNow
  ]);

  useEffect(() => {
    if (spark.loading || restored.current) return;
    restored.current = true;
    const active = spark.focusSessions.find((candidate) => !candidate.endedAt);
    if (!active) return;
    setSession(active);
    setTitle(active.title === 'Open focus' ? '' : active.title);
    setMinutes(Math.max(1, Math.round(active.plannedSeconds / 60)));
    const value = remainingSeconds(active);
    setRemaining(value);
    setPhase(active.pausedAt ? 'paused' : 'running');
    if (!active.pausedAt && value > 0) {
      void scheduleFocusNotification(active, value, true);
    }
  }, [spark.focusSessions, spark.loading]);

  useEffect(() => {
    if (phase === 'idle') setRemaining(minutes * 60);
  }, [minutes, phase]);

  const finish = useCallback(
    async (completed: boolean) => {
      if (!session || finishing.current) return;
      finishing.current = true;
      await cancelFocusNotification(session.id);
      const now = new Date();
      const pausedSeconds =
        session.pausedSeconds +
        (session.pausedAt
          ? Math.max(0, Math.round((now.getTime() - Date.parse(session.pausedAt)) / 1000))
          : 0);
      const ended: FocusSession = {
        ...session,
        endedAt: now.toISOString(),
        pausedAt: null,
        pausedSeconds,
        completed
      };
      try {
        await spark.saveFocus(ended);
        setSession(ended);
        setPhase('finished');
        if (spark.settings.hapticsEnabled && !isQuietNow(spark.settings)) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (reason) {
        await reportError('focus.finish', reason);
      } finally {
        finishing.current = false;
      }
    },
    [session, spark]
  );

  useEffect(() => {
    if (phase !== 'running' || !session) return;
    const update = () => {
      const value = remainingSeconds(session);
      setRemaining(value);
      if (value === 0) void finish(true);
    };
    update();
    const interval = setInterval(update, 250);
    const appState = AppState.addEventListener('change', update);
    return () => {
      clearInterval(interval);
      appState.remove();
    };
  }, [finish, phase, session]);

  const beginSession = useCallback(async () => {
    const startTime = new Date();
    const started: FocusSession = {
      id: createId('focus'),
      title: title.trim() || 'Open focus',
      plannedSeconds: minutes * 60,
      startedAt: startTime.toISOString(),
      endedAt: null,
      pausedAt: null,
      pausedSeconds: 0,
      completed: false,
      interruptionCount: 0
    };
    setSession(started);
    setRemaining(started.plannedSeconds);
    setPhase('running');
    try {
      await clearDraft();
      await spark.saveFocus(started);
      await scheduleFocusNotification(started, started.plannedSeconds);
    } catch (reason) {
      await reportError('focus.start', reason);
    }
  }, [clearDraft, minutes, spark, title]);

  function start() {
    if (spark.settings.launchCountdownEnabled) {
      setLaunchCountdown(5);
      return;
    }
    void beginSession();
  }

  useEffect(() => {
    if (launchCountdown == null) return;
    if (launchCountdown <= 0) {
      setLaunchCountdown(null);
      void beginSession();
      return;
    }
    const timeout = setTimeout(
      () => setLaunchCountdown((value) => (value == null ? null : value - 1)),
      1000
    );
    return () => clearTimeout(timeout);
  }, [beginSession, launchCountdown]);

  async function pause() {
    if (!session) return;
    const paused: FocusSession = {
      ...session,
      pausedAt: new Date().toISOString()
    };
    setRemaining(remainingSeconds(paused));
    setSession(paused);
    setPhase('paused');
    await cancelFocusNotification(session.id);
    try {
      await spark.saveFocus(paused);
    } catch (reason) {
      await reportError('focus.pause', reason);
    }
  }

  async function resume() {
    if (!session?.pausedAt) return;
    const now = Date.now();
    const resumed: FocusSession = {
      ...session,
      pausedSeconds:
        session.pausedSeconds +
        Math.max(0, Math.round((now - Date.parse(session.pausedAt)) / 1000)),
      pausedAt: null
    };
    setSession(resumed);
    setRemaining(remainingSeconds(resumed, now));
    setPhase('running');
    try {
      await spark.saveFocus(resumed);
      await scheduleFocusNotification(resumed, remainingSeconds(resumed, now), true);
    } catch (reason) {
      await reportError('focus.resume', reason);
    }
  }

  function reset() {
    setPhase('idle');
    setSession(null);
    setRemaining(minutes * 60);
    setInterruptionText('');
    setNextMove('');
    finishing.current = false;
  }

  async function parkInterruption() {
    if (!interruptionText.trim()) return;
    try {
      await spark.addCapture(interruptionText);
      setInterruptionText('');
      if (session) {
        const updated = {
          ...session,
          interruptionCount: session.interruptionCount + 1
        };
        setSession(updated);
        await spark.saveFocus(updated);
      }
      if (spark.settings.hapticsEnabled && !isQuietNow(spark.settings)) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (reason) {
      await reportError('focus.park_interruption', reason);
    }
  }

  async function parkNextMove() {
    if (!nextMove.trim()) return;
    try {
      await spark.addCapture(nextMove);
      setNextMove('');
    } catch (reason) {
      await reportError('focus.park_next_move', reason);
    }
  }

  function actualMinutes(item: FocusSession): number {
    if (!item.endedAt) return 0;
    const seconds = Math.max(
      0,
      Math.round(
        (Date.parse(item.endedAt) - Date.parse(item.startedAt)) / 1000 -
          item.pausedSeconds
      )
    );
    return Math.max(1, Math.round(seconds / 60));
  }

  const history = spark.focusSessions.filter((candidate) => candidate.endedAt);

  return (
    <Screen testID="focus-screen">
      <View>
        <Eyebrow>Body double</Eyebrow>
        <H1>Focus, with company.</H1>
        <Muted>
          The active session is saved immediately, so locking or restarting your phone cannot
          erase it.
        </Muted>
      </View>

      <Card style={styles.timerCard}>
        <Companion
          active={phase === 'running'}
          reducedMotion={spark.settings.reducedMotion || quietNow}
          style={spark.entitlement.premium ? spark.settings.companionStyle : 'spark'}
        />
        <Text
          accessibilityRole="timer"
          accessibilityLabel={`${Math.ceil(remaining / 60)} minutes remaining`}
          style={[styles.timer, { color: theme.text }]}
        >
          {secondsLabel(remaining)}
        </Text>
        <Text style={[styles.state, { color: theme.textMuted }]}>
          {phase === 'idle'
            ? 'Ready when you are'
            : phase === 'paused'
              ? 'Paused without penalty'
              : phase === 'finished'
                ? 'That was a real focus block'
                : session?.title || title.trim() || 'Open focus'}
        </Text>
        {phase === 'idle' ? (
          launchCountdown != null ? (
            <View style={styles.finished}>
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.launchCount, { color: theme.primary }]}
              >
                {launchCountdown}
              </Text>
              <SectionHeading>Beginning is the only job.</SectionHeading>
              <Muted>You can start now or choose Not yet. There is no penalty.</Muted>
              <Button
                label="Start now"
                onPress={() => {
                  setLaunchCountdown(null);
                  void beginSession();
                }}
              />
              <Button
                label="Not yet"
                variant="ghost"
                onPress={() => setLaunchCountdown(null)}
              />
            </View>
          ) : (
            <>
            <FormField
              label="One target"
              placeholder="e.g. Open the document"
              value={title}
              onChangeText={setTitle}
              maxLength={120}
            />
            <View style={styles.chips}>
              {durationOptions.map((value) => (
                <Chip
                  key={value}
                  label={`${value} min`}
                  selected={minutes === value}
                  onPress={() => setMinutes(value)}
                />
              ))}
              {!durationOptions.includes(2) ? (
                <Chip label="2 min launch" selected={minutes === 2} onPress={() => setMinutes(2)} />
              ) : null}
            </View>
            {spark.entitlement.premium && spark.settings.soundscapeEnabled ? (
              <Muted>
                Offline {spark.settings.soundscapeKind} soundscape · volume{' '}
                {Math.round(spark.settings.soundscapeVolume * 100)}%
              </Muted>
            ) : null}
            <Button label="Start together" onPress={start} testID="start-focus" />
            <Button
              label="Add this focus block to calendar"
              variant="ghost"
              onPress={() => {
                const startAt = new Date();
                const endAt = new Date(startAt.getTime() + minutes * 60_000);
                void openCalendarExport({
                  title: `Spark focus: ${title.trim() || 'Open focus'}`,
                  startAt,
                  endAt,
                  notes:
                    'Created explicitly from Spark. Spark did not read or connect to your calendar.'
                }).catch((reason: unknown) =>
                  Alert.alert(
                    'Could not open calendar',
                    reason instanceof Error ? reason.message : 'Try again.'
                  )
                );
              }}
            />
            </>
          )
        ) : phase === 'finished' ? (
          <View style={styles.finished}>
            <Text style={styles.finishedEmoji}>✦</Text>
            <SectionHeading>Close the loop gently.</SectionHeading>
            <Muted>Stand, sip water, or look away from the screen before the next choice.</Muted>
            {spark.settings.transitionNudgesEnabled ? (
              <View style={styles.nextMove}>
                <FormField
                  label="When you are ready, what is the next tiny move?"
                  placeholder="Optional"
                  value={nextMove}
                  onChangeText={setNextMove}
                  maxLength={160}
                />
                <Button
                  label="Park next move in Capture"
                  variant="secondary"
                  disabled={!nextMove.trim()}
                  onPress={() => void parkNextMove()}
                />
              </View>
            ) : null}
            <Button label="Done" onPress={reset} />
          </View>
        ) : (
          <View style={styles.timerActions}>
            <Button
              label={phase === 'paused' ? 'Resume' : 'Pause'}
              onPress={() => void (phase === 'paused' ? resume() : pause())}
              icon={
                <Ionicons
                  name={phase === 'paused' ? 'play' : 'pause'}
                  size={19}
                  color={theme.primaryText}
                />
              }
            />
            <Button label="Finish early" variant="ghost" onPress={() => void finish(false)} />
          </View>
        )}
      </Card>

      {phase === 'running' || phase === 'paused' ? (
        <Card>
          <SectionHeading>Thought tried to steal the wheel?</SectionHeading>
          <Muted>Park it here. Spark will keep it in Capture so your brain can let go.</Muted>
          <FormField
            label="Parking lot"
            placeholder="Remember to…"
            value={interruptionText}
            onChangeText={setInterruptionText}
            onSubmitEditing={() => void parkInterruption()}
            returnKeyType="done"
          />
          <Button
            label="Park thought"
            variant="secondary"
            disabled={!interruptionText.trim()}
            onPress={() => void parkInterruption()}
          />
          <Muted>{session?.interruptionCount ?? 0} parked during this session</Muted>
        </Card>
      ) : null}

      {history.length ? (
        <View style={styles.history}>
          <SectionHeading>Recent company</SectionHeading>
          {history.slice(0, 4).map((item) => (
            <View key={item.id} style={styles.historyRow}>
              <View
                style={[
                  styles.historyIcon,
                  { backgroundColor: item.completed ? `${theme.success}22` : theme.surfaceAlt }
                ]}
              >
                <Ionicons
                  name={item.completed ? 'checkmark' : 'stop-outline'}
                  size={18}
                  color={item.completed ? theme.success : theme.textMuted}
                />
              </View>
              <View style={styles.historyText}>
                <Text style={[styles.historyTitle, { color: theme.text }]}>{item.title}</Text>
                <Muted>
                  planned {Math.round(item.plannedSeconds / 60)} min · actual{' '}
                  {actualMinutes(item)} min · {friendlyTime(item.startedAt)}
                </Muted>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  timerCard: { padding: 20, alignItems: 'stretch' },
  companionArea: { alignItems: 'center', gap: 8 },
  companion: {
    width: 112,
    height: 95,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  companionFace: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', marginTop: -5 },
  companionLaptop: {
    width: 72,
    height: 25,
    borderRadius: 5,
    position: 'absolute',
    bottom: -8
  },
  timer: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 58,
    lineHeight: 68,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -2
  },
  state: { textAlign: 'center', fontSize: 14, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timerActions: { gap: 9 },
  finished: { alignItems: 'center', gap: 9 },
  finishedEmoji: { fontSize: 46, color: '#FFC857' },
  launchCount: { fontSize: 64, fontWeight: '900' },
  nextMove: { width: '100%', gap: 8 },
  history: { gap: 11 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  historyIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center'
  },
  historyText: { flex: 1 },
  historyTitle: { fontSize: 15, fontWeight: '700' }
});
