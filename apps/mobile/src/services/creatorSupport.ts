import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

export const CREATOR_TIP_URL = 'https://buymeacoffee.com/djpokis';

/**
 * External creator-payment links require store-program review. The release-safe default is off.
 * Enable only for a distribution channel where the link is permitted.
 */
export function creatorTipLinkEnabled(): boolean {
  return Constants.expoConfig?.extra?.sparkCreatorTipLinkEnabled === true;
}

export async function openCreatorTipLink(): Promise<void> {
  const supported = await Linking.canOpenURL(CREATOR_TIP_URL);
  if (!supported) throw new Error('No browser is available to open the support page.');
  await Linking.openURL(CREATOR_TIP_URL);
}
