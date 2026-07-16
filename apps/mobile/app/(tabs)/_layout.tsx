import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTheme } from '../../src/theme';
import { useI18n } from '../../src/i18n';
import { useSpark } from '../../src/state/SparkProvider';

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useI18n();
  const spark = useSpark();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.border,
          minHeight: 72,
          paddingBottom: 10,
          paddingTop: 7
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('today'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="focus"
        options={{
          title: t('focus'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="timer-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: t('capture'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flash-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: t('journey'),
          href: spark.settings.simpleMode ? null : '/(tabs)/journey',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" color={color} size={size} />
          )
        }}
      />
    </Tabs>
  );
}
