import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppErrorBoundary } from '../src/components/AppErrorBoundary';
import { SparkProvider, useSpark } from '../src/state/SparkProvider';
import { SparkThemeProvider, useTheme } from '../src/theme';

function Navigation() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
          headerBackTitle: 'Back'
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="habit/new" options={{ title: 'New habit', presentation: 'modal' }} />
        <Stack.Screen name="habit/[id]" options={{ title: 'Edit habit' }} />
        <Stack.Screen name="routine/[id]" options={{ title: 'Routine' }} />
        <Stack.Screen name="routine/new" options={{ title: 'New routine', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="support" options={{ title: 'Private support' }} />
        <Stack.Screen name="support/[id]" options={{ title: 'Conversation' }} />
        <Stack.Screen name="paywall" options={{ title: 'Spark premium', presentation: 'modal' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
        <Stack.Screen name="widget-action" options={{ headerShown: false }} />
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
    >
      <Navigation />
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
