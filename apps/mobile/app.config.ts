import type { ConfigContext, ExpoConfig } from 'expo/config';
import type { WithAndroidWidgetsParams } from 'react-native-android-widget';

const packageName = 'com.sparkhabits.app';
const widgetConfig: WithAndroidWidgetsParams = {
  widgets: [
    {
      name: 'SparkToday',
      label: 'Spark Today',
      description: 'Keep one gentle next action visible.',
      minWidth: '250dp',
      minHeight: '110dp',
      targetCellWidth: 4,
      targetCellHeight: 2,
      previewImage: './assets/spark-icon-v2.png',
      updatePeriodMillis: 1_800_000
    }
  ]
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Spark',
  slug: 'spark-adhd-habits',
  owner: process.env.EXPO_OWNER || undefined,
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/spark-icon-v2.png',
  scheme: 'spark',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: packageName,
    buildNumber: '1',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    package: packageName,
    versionCode: 1,
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW'
    ],
    adaptiveIcon: {
      foregroundImage: './assets/spark-icon-v2.png',
      backgroundColor: '#0B1020'
    },
    permissions: ['VIBRATE', 'RECEIVE_BOOT_COMPLETED']
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/spark-icon-v2.png'
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/spark-icon-v2.png',
        imageWidth: 180,
        resizeMode: 'contain',
        backgroundColor: '#0B1020',
        dark: {
          image: './assets/spark-icon-v2.png',
          backgroundColor: '#070B17'
        }
      }
    ],
    [
      'expo-sqlite',
      {
        enableFTS: true,
        useSQLCipher: true
      }
    ],
    [
      'expo-notifications',
      {
        color: '#FF6B5F',
        defaultChannel: 'gentle-reminders'
      }
    ],
    [
      'expo-document-picker',
      {
        iCloudContainerEnvironment: 'Production'
      }
    ],
    'react-native-iap',
    ['react-native-android-widget', widgetConfig]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    router: {},
    eas: {
      projectId: process.env.EXPO_PROJECT_ID || undefined
    },
    sparkApiUrl: process.env.EXPO_PUBLIC_SPARK_API_URL || '',
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''
    }
  }
});
