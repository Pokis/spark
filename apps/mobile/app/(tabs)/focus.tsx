import type { FocusSession } from '@spark/domain';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Pressable,
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
import { useSpark } from '../../src/state/SparkProvider';
import { useTheme } from '../../src/theme';

type TimerState = 'idle' | 'running' | 'paused' | 'finished';

function Companion({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
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
        <Text style={styles.companionFace}>{active ? '• ᴗ •' : '• – •'}</Text>
        <View style={[styles.companionLaptop, { backgroundColor: theme.surfaceAlt }]} />
      </Animated.View>
      <Muted>{active ? 'I’m staying with you.' : 'Pick one small target.'}</Muted>
    </View>
  );
}

export default function FocusScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const durationOptions = spark.remoteConfig.defaults.focusMinutes.length
    ? spark.remoteConfig.defaults.focusMinutes
    : [5, 10, 25, 50];
  const [minutes, setMinutes] = useState(spark.settings.defaultFocusMinutes);
  const [title, setTitle] = useState('');
  const [state, setState] = useState<TimerState>('idle');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [pausedMs, setPausedMs] = useState(0);
  const [remaining, setRemaining] = useState(minutes * 60);
  const [interruptions, setInterruptions] = useState(0);
  const [interruptionText, setInterruptionText] = useState('');
  const notificationId = useRef<string | null>(null);
  const saved = useRef(false);

  function calculateRemaining(): number {
    if (!startedAt) return minutes * 60;
    const now = pausedAt ?? Date.now();
    return Math.max(0, Math.ceil((minutes * 60_000 - (now - startedAt - pausedMs)) / 1000));
  }

  async function persist(completed: boolean) {
    if (!startedAt || saved.current) return;
    saved.current = true;
    const endedAt = new Date().toISOString();
    const session: FocusSession = {
      id: createId('focus'),
      title: title.trim() || 'Open focus',
      plannedSeconds: minutes * 60,
      startedAt: new Date(startedAt).toISOString(),
      endedAt,
      pausedAt: null,
      pausedSeconds: Math.round(pausedMs / 1000),
      completed,
      interruptionCount: interruptions
    };
    await spark.saveFocus(session);
  }

  useEffect(() => {
    if (state !== 'running') return;
    const update = () => {
      const value = calculateRemaining();
      setRemaining(value);
      if (value === 0) {
        setState('finished');
        void persist(true);
        if (spark.settings.hapticsEnabled) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    };
    update();
    const interval = setInterval(update, 250);
    const appState = AppState.addEventListener('change', update);
    return () => {
      clearInterval(interval);
      appState.remove();
    };
  });

  useEffect(() => {
    if (state === 'idle') setRemaining(minutes * 60);
  }, [minutes, state]);

  async function start() {
    saved.current = false;
    const startTime = Date.now();
    setStartedAt(startTime);
    setPausedAt(null);
    setPausedMs(0);
    setRemaining(minutes * 60);
    setInterruptions(0);
    setState('running');
    notificationId.current = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Focus session complete ✦',
        body: 'Take a breath before choosing what is next.',
        sound: false
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: minutes * 60
      }
    });
  }

  async function pause() {
    setRemaining(calculateRemaining());
    setPausedAt(Date.now());
    setState('paused');
    if (notificationId.current) {
      await Notifications.cancelScheduledNotificationAsync(notificationId.current);
      notificationId.current = null;
    }
  }

  async function resume() {
    const now = Date.now();
    if (pausedAt) setPausedMs((value) => value + now - pausedAt);
    setPausedAt(null);
    setState('running');
    notificationId.current = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Focus session complete ✦',
        body: 'You came back to the task.',
        sound: false
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, remaining)
      }
    });
  }

  async function stop() {
    if (notificationId.current) {
      await Notifications.cancelScheduledNotificationAsync(notificationId.current);
      notificationId.current = null;
    }
    await persist(false);
    reset();
  }

  function reset() {
    setState('idle');
    setStartedAt(null);
    setPausedAt(null);
    setPausedMs(0);
    setRemaining(minutes * 60);
    setInterruptionText('');
    saved.current = false;
  }

  async function parkInterruption() {
    if (!interruptionText.trim()) return;
    await spark.addCapture(interruptionText);
    setInterruptionText('');
    setInterruptions((value) => value + 1);
    if (spark.settings.hapticsEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  return (
    <Screen testID="focus-screen">
      <View>
        <Eyebrow>Body double</Eyebrow>
        <H1>Focus, with company.</H1>
        <Muted>The timer uses real timestamps, so locking your phone cannot lose the session.</Muted>
      </View>

      <Card style={styles.timerCard}>
        <Companion
          active={state === 'running'}
          reducedMotion={spark.settings.reducedMotion}
        />
        <Text
          accessibilityRole="timer"
          accessibilityLabel={`${Math.ceil(remaining / 60)} minutes remaining`}
          style={[styles.timer, { color: theme.text }]}
        >
          {secondsLabel(remaining)}
        </Text>
        <Text style={[styles.state, { color: theme.textMuted }]}>
          {state === 'idle'
            ? 'Ready when you are'
            : state === 'paused'
              ? 'Paused without penalty'
              : state === 'finished'
                ? 'That was a real focus block'
                : title.trim() || 'Open focus'}
        </Text>
        {state === 'idle' ? (
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
            </View>
            <Button label="Start together" onPress={() => void start()} testID="start-focus" />
          </>
        ) : state === 'finished' ? (
          <View style={styles.finished}>
            <Text style={styles.finishedEmoji}>✦</Text>
            <SectionHeading>Close the loop gently.</SectionHeading>
            <Muted>Stand, sip water, or look away from the screen before the next choice.</Muted>
            <Button label="Done" onPress={reset} />
          </View>
        ) : (
          <View style={styles.timerActions}>
            <Button
              label={state === 'paused' ? 'Resume' : 'Pause'}
              onPress={() => void (state === 'paused' ? resume() : pause())}
              icon={
                <Ionicons
                  name={state === 'paused' ? 'play' : 'pause'}
                  size={19}
                  color={theme.primaryText}
                />
              }
            />
            <Button label="Finish early" variant="ghost" onPress={() => void stop()} />
          </View>
        )}
      </Card>

      {state === 'running' || state === 'paused' ? (
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
          <Muted>{interruptions} parked during this session</Muted>
        </Card>
      ) : null}

      {spark.focusSessions.length ? (
        <View style={styles.history}>
          <SectionHeading>Recent company</SectionHeading>
          {spark.focusSessions.slice(0, 4).map((session) => (
            <View key={session.id} style={styles.historyRow}>
              <View
                style={[
                  styles.historyIcon,
                  { backgroundColor: session.completed ? `${theme.success}22` : theme.surfaceAlt }
                ]}
              >
                <Ionicons
                  name={session.completed ? 'checkmark' : 'stop-outline'}
                  size={18}
                  color={session.completed ? theme.success : theme.textMuted}
                />
              </View>
              <View style={styles.historyText}>
                <Text style={[styles.historyTitle, { color: theme.text }]}>{session.title}</Text>
                <Muted>
                  {Math.round(session.plannedSeconds / 60)} min · {friendlyTime(session.startedAt)}
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
