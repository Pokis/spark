import type { ConfigContext, ExpoConfig } from 'expo/config';
import type { WithAndroidWidgetsParams } from 'react-native-android-widget';

const packageName = 'com.djpokis.sparkhabits.app';
const expoOwner = 'djpokis-team';
const expoProjectId = 'd13c96e7-3533-4fdb-88da-48e0b5a4f932';
const iconVariant = process.env.SPARK_ICON_VARIANT || 'calm';
const iconAsset =
  iconVariant === 'classic' ? './assets/spark-icon.png' : './assets/spark-icon-v2.png';
const iconBackground =
  iconVariant === 'midnight' ? '#070B17' : iconVariant === 'classic' ? '#FF6B5F' : '#0B1020';
const widgetConfig: WithAndroidWidgetsParams = {
  widgets: [
    {
      name: 'SparkToday',
      label: 'Spark Today',
      description: 'Keep one next action visible.',
      minWidth: '250dp',
      minHeight: '110dp',
      targetCellWidth: 4,
      targetCellHeight: 2,
      previewImage: './assets/spark-icon-v2.png',
      updatePeriodMillis: 1_800_000
    },
    {
      name: 'SparkCapture',
      label: 'Spark Quick Capture',
      description: 'Open Quick Capture directly from your home screen.',
      minWidth: '180dp',
      minHeight: '70dp',
      targetCellWidth: 3,
      targetCellHeight: 1,
      previewImage: './assets/spark-icon-v2.png',
      updatePeriodMillis: 86_400_000
    },
    {
      name: 'SparkFocus',
      label: 'Spark Focus',
      description: 'See, pause, or resume the current focus session.',
      minWidth: '180dp',
      minHeight: '110dp',
      targetCellWidth: 3,
      targetCellHeight: 2,
      previewImage: './assets/spark-icon-v2.png',
      updatePeriodMillis: 1_800_000
    },
    {
      name: 'SparkProgress',
      label: 'Spark Progress',
      description: 'Keep wins, milestones, and Spark points visible.',
      minWidth: '180dp',
      minHeight: '110dp',
      targetCellWidth: 3,
      targetCellHeight: 2,
      previewImage: './assets/spark-icon-v2.png',
      updatePeriodMillis: 1_800_000
    },
    {
      name: 'SparkToolkit',
      label: 'Spark Toolkit',
      description: 'Open capture, focus, departure, or immediate help in one tap.',
      minWidth: '250dp',
      minHeight: '180dp',
      targetCellWidth: 4,
      targetCellHeight: 3,
      previewImage: './assets/spark-icon-v2.png',
      updatePeriodMillis: 86_400_000
    },
    {
      name: 'SparkRoutine',
      label: 'Spark Routine',
      description: 'Keep the current routine step visible and resume in one tap.',
      minWidth: '180dp',
      minHeight: '110dp',
      targetCellWidth: 3,
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
  owner: process.env.EXPO_OWNER || expoOwner,
  version: '0.1.0',
  orientation: 'portrait',
  icon: iconAsset,
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
    allowBackup: false,
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_CALENDAR',
      'android.permission.WRITE_CALENDAR'
    ],
    adaptiveIcon: {
      foregroundImage: iconAsset,
      backgroundColor: iconBackground
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
    [
      'expo-localization',
      {
        supportedLocales: [
          'en',
          'es',
          'pt-BR',
          'fr',
          'de',
          'it',
          'pl',
          'uk',
          'ru',
          'lt',
          'ja',
          'ko',
          'zh-Hans',
          'hi',
          'ar',
          'nl',
          'tr',
          'id',
          'vi'
        ],
        supportsRTL: true
      }
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Allow Spark to unlock your private local habits and notes.'
      }
    ],
    'expo-secure-store',
    './plugins/withSparkShortcuts',
    './plugins/withSparkPerformance',
    './plugins/withSparkReleaseSigning',
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
        defaultChannel: 'spark-timers'
      }
    ],
    [
      'expo-document-picker',
      {
        iCloudContainerEnvironment: 'Production'
      }
    ],
    [
      'expo-audio',
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundRecording: false,
        enableBackgroundPlayback: false
      }
    ],
    [
      'expo-sharing',
      {
        android: {
          enabled: true,
          singleShareMimeTypes: ['text/plain', 'text/*']
        }
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
      projectId: process.env.EXPO_PROJECT_ID || expoProjectId
    },
    sparkApiUrl: process.env.EXPO_PUBLIC_SPARK_API_URL || '',
    sparkRemoteConfigEnabled:
      process.env.EXPO_PUBLIC_SPARK_REMOTE_CONFIG_ENABLED === 'true',
    sparkCreatorTipLinkEnabled:
      process.env.EXPO_PUBLIC_SPARK_CREATOR_TIP_LINK_ENABLED === 'true',
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''
    }
  }
});
