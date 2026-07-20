import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppErrorBoundary } from '../src/components/AppErrorBoundary';
import { PrivacyGate } from '../src/components/PrivacyGate';
import { useI18n } from '../src/i18n';
import { SparkProvider, useSpark } from '../src/state/SparkProvider';
import { SparkThemeProvider, useTheme } from '../src/theme';
import { isQuietNow } from '../src/lib/sensory';

function Navigation() {
  const theme = useTheme();
  const spark = useSpark();
  const { t } = useI18n();
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
          headerBackTitle: t('back'),
          animation:
            spark.settings.reducedMotion || isQuietNow(spark.settings)
              ? 'none'
              : 'slide_from_right'
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="habit/new" options={{ title: t('newHabit'), presentation: 'modal' }} />
        <Stack.Screen name="habit/[id]" options={{ title: t('editHabit') }} />
        <Stack.Screen name="habit/[id]/history" options={{ title: t('habitHistory') }} />
        <Stack.Screen name="routine/[id]" options={{ title: t('routine') }} />
        <Stack.Screen name="routine/[id]/edit" options={{ title: t('editRoutine') }} />
        <Stack.Screen name="routine/new" options={{ title: t('newRoutine'), presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: t('settings') }} />
        <Stack.Screen name="features" options={{ title: 'Optional features' }} />
        <Stack.Screen name="support" options={{ title: 'Private support' }} />
        <Stack.Screen name="support/[id]" options={{ title: 'Conversation' }} />
        <Stack.Screen name="paywall" options={{ title: 'Spark premium', presentation: 'modal' }} />
        <Stack.Screen name="privacy" options={{ title: t('privacy') }} />
        <Stack.Screen name="help" options={{ title: t('helpNow') }} />
        <Stack.Screen name="guide" options={{ title: 'How Spark works' }} />
        <Stack.Screen name="tutorials" options={{ title: 'Feature tutorials' }} />
        <Stack.Screen name="weekly-reset" options={{ title: t('weeklyReset') }} />
        <Stack.Screen name="departure" options={{ title: t('departureMode') }} />
        <Stack.Screen name="experiments" options={{ title: t('experiments') }} />
        <Stack.Screen name="share-progress" options={{ title: t('shareProgress') }} />
        <Stack.Screen name="encrypted-backups" options={{ title: t('encryptedBackups') }} />
        <Stack.Screen name="diagnostics" options={{ title: t('diagnostics') }} />
        <Stack.Screen name="focus-widget-action" options={{ headerShown: false }} />
        <Stack.Screen name="focus-launch" options={{ headerShown: false }} />
        <Stack.Screen name="rescue" options={{ headerShown: false }} />
        <Stack.Screen name="resume-routine" options={{ headerShown: false }} />
        <Stack.Screen name="widget-action" options={{ headerShown: false }} />
        <Stack.Screen name="quick-capture" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

function ThemedNavigation() {
  const spark = useSpark();
  return (
    <SparkThemeProvider
      highContrast={spark.settings.highContrast}
      supporter={spark.entitlement.premium && spark.settings.supporterThemeEnabled}
      supporterTheme={spark.settings.supporterTheme}
    >
      <PrivacyGate>
        <Navigation />
      </PrivacyGate>
    </SparkThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <SparkProvider>
        <ThemedNavigation />
      </SparkProvider>
    </AppErrorBoundary>
  );
}
