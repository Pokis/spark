import { jest } from '@jest/globals';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' }
}));

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
