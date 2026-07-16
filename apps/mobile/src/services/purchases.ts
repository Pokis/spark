import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { cloudUserId } from './cloudAuth';
import { verifyGooglePurchase } from './api';

export const PREMIUM_PRODUCT_ID = 'spark_premium_lifetime';

export function purchasesSupportedOnPlatform(): boolean {
  return Platform.OS === 'android';
}

type IapModule = typeof import('react-native-iap');

async function iap(): Promise<IapModule> {
  try {
    return await import('react-native-iap');
  } catch {
    throw new Error(
      'Purchases need a Spark development or Play Store build. They are unavailable in Expo Go.'
    );
  }
}

export async function premiumDisplayPrice(
  loadStore: () => Promise<IapModule> = iap
): Promise<string | null> {
  if (!purchasesSupportedOnPlatform()) return null;
  const store = await loadStore();
  await store.initConnection();
  try {
    const products = await store.fetchProducts({
      skus: [PREMIUM_PRODUCT_ID],
      type: 'in-app'
    });
    return products?.[0]?.displayPrice ?? null;
  } finally {
    await store.endConnection();
  }
}

export async function purchasePremium(
  loadStore: () => Promise<IapModule> = iap
): Promise<void> {
  if (!purchasesSupportedOnPlatform()) {
    throw new Error(
      'iPhone purchases are disabled until App Store server verification is implemented.'
    );
  }
  const store = await loadStore();
  await store.initConnection();
  try {
    const accountId = await cloudUserId();
    const obfuscatedAccountId = accountId
      ? await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          accountId
        )
      : undefined;
    const products = await store.fetchProducts({
      skus: [PREMIUM_PRODUCT_ID],
      type: 'in-app'
    });
    if (!products?.length) {
      throw new Error('The premium product is not available for this Play account yet.');
    }
    const purchase = await store.requestPurchase({
      request: {
        android: {
          skus: [PREMIUM_PRODUCT_ID],
          obfuscatedAccountId
        },
        ios: { sku: PREMIUM_PRODUCT_ID }
      },
      type: 'in-app'
    });
    const first = Array.isArray(purchase) ? purchase[0] : purchase;
    if (!first) throw new Error('The store did not return a purchase.');
    if (Platform.OS === 'android') {
      const token =
        'purchaseToken' in first && typeof first.purchaseToken === 'string'
          ? first.purchaseToken
          : null;
      if (!token) throw new Error('The Play purchase token was missing.');
      await verifyGooglePurchase(PREMIUM_PRODUCT_ID, token, false);
    }
    await store.finishTransaction({ purchase: first, isConsumable: false });
  } finally {
    await store.endConnection();
  }
}

export async function restorePurchases(
  loadStore: () => Promise<IapModule> = iap
): Promise<void> {
  if (!purchasesSupportedOnPlatform()) {
    throw new Error(
      'iPhone purchase restore is disabled until App Store server verification is implemented.'
    );
  }
  const store = await loadStore();
  await store.initConnection();
  try {
    const purchases = await store.getAvailablePurchases();
    const premium = purchases.find((purchase) => purchase.productId === PREMIUM_PRODUCT_ID);
    if (!premium) throw new Error('No previous Spark premium purchase was found.');
    if (Platform.OS === 'android') {
      const token =
        'purchaseToken' in premium && typeof premium.purchaseToken === 'string'
          ? premium.purchaseToken
          : null;
      if (!token) throw new Error('The Play purchase token was missing.');
      await verifyGooglePurchase(PREMIUM_PRODUCT_ID, token, true);
    }
  } finally {
    await store.endConnection();
  }
}
