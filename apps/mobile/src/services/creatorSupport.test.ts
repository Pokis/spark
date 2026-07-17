import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import {
  CREATOR_TIP_URL,
  creatorTipLinkEnabled,
  openCreatorTipLink
} from './creatorSupport';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { sparkCreatorTipLinkEnabled: false } }
  }
}));

jest.mock('expo-linking', () => ({
  canOpenURL: jest.fn(),
  openURL: jest.fn()
}));

describe('optional creator support link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Constants.expoConfig!.extra as Record<string, unknown>).sparkCreatorTipLinkEnabled =
      false;
  });

  it('is release-safe and disabled unless explicitly enabled at build time', () => {
    expect(creatorTipLinkEnabled()).toBe(false);
    (Constants.expoConfig!.extra as Record<string, unknown>).sparkCreatorTipLinkEnabled =
      true;
    expect(creatorTipLinkEnabled()).toBe(true);
  });

  it('opens only the fixed HTTPS creator page in the system browser', async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
    await openCreatorTipLink();
    expect(Linking.canOpenURL).toHaveBeenCalledWith(CREATOR_TIP_URL);
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://buymeacoffee.com/djpokis'
    );
  });

  it('fails clearly without attempting navigation when no browser is available', async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);
    await expect(openCreatorTipLink()).rejects.toThrow('No browser is available');
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
