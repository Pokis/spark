import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { useSpark } from '../state/SparkProvider';
import { Button } from './Button';
import { Card } from './Card';
import { Screen } from './Screen';
import { H1, Muted, SectionHeading } from './Typography';
import { LoadingState } from './LoadingState';

const PROTECTION_KEY = 'spark-sensitive-preview';

export function PrivacyGate({ children }: PropsWithChildren) {
  const spark = useSpark();
  const { loading, settings } = spark;
  const [locked, setLocked] = useState(settings.appLockEnabled);
  const [checkingLock, setCheckingLock] = useState(true);
  const backgroundedAt = useRef<number | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!initialized.current) {
      initialized.current = true;
      if (!settings.appLockEnabled) {
        setLocked(false);
        setCheckingLock(false);
        return;
      }
      void Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync()
      ]).then(([hardware, enrolled]) => {
        if (hardware && enrolled) {
          setLocked(true);
        } else {
          setLocked(false);
          void spark.updateSetting('appLockEnabled', false);
        }
        setCheckingLock(false);
      }).catch(() => {
        setLocked(false);
        setCheckingLock(false);
        void spark.updateSetting('appLockEnabled', false);
      });
    } else if (!settings.appLockEnabled) {
      setLocked(false);
      setCheckingLock(false);
    }
  }, [loading, settings.appLockEnabled]);

  useEffect(() => {
    if (loading) return;
    const protect = async () => {
      if (Platform.OS === 'ios') {
        if (settings.hideSensitiveAppPreview) {
          await ScreenCapture.enableAppSwitcherProtectionAsync(0.7);
        } else {
          await ScreenCapture.disableAppSwitcherProtectionAsync();
        }
      } else if (settings.hideSensitiveAppPreview) {
        await ScreenCapture.preventScreenCaptureAsync(PROTECTION_KEY);
      } else {
        await ScreenCapture.allowScreenCaptureAsync(PROTECTION_KEY);
      }
    };
    void protect().catch(() => undefined);
    return () => {
      if (Platform.OS === 'ios') {
        void ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => undefined);
      } else {
        void ScreenCapture.allowScreenCaptureAsync(PROTECTION_KEY).catch(() => undefined);
      }
    };
  }, [loading, settings.hideSensitiveAppPreview]);

  useEffect(() => {
    if (!settings.appLockEnabled) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const awayFor = backgroundedAt.current
          ? Date.now() - backgroundedAt.current
          : Number.POSITIVE_INFINITY;
        if (awayFor >= settings.appLockTimeoutMinutes * 60_000) setLocked(true);
        backgroundedAt.current = null;
      } else if (state === 'background' || state === 'inactive') {
        backgroundedAt.current ??= Date.now();
      }
    });
    return () => subscription.remove();
  }, [settings.appLockEnabled, settings.appLockTimeoutMinutes]);

  async function unlock() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Spark',
      promptSubtitle: 'Your local habits and notes stay private',
      cancelLabel: 'Not now',
      fallbackLabel: 'Use device passcode',
      disableDeviceFallback: false
    });
    if (result.success) setLocked(false);
  }

  if (loading || checkingLock) return <LoadingState />;
  if (!locked || !settings.appLockEnabled) return children;

  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.mark}>
        <H1>✦ Spark is locked</H1>
      </View>
      <Card>
        <SectionHeading>Your local data is still here.</SectionHeading>
        <Muted>Use your device authentication to open Spark. No Spark account is involved.</Muted>
        <Button label="Unlock Spark" onPress={() => void unlock()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center' },
  mark: { alignItems: 'center' }
});
