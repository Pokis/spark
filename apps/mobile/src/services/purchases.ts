import { Platform } from 'react-native';
import { verifyGooglePurchase } from './api';

export const PREMIUM_PRODUCT_ID = 'spark_premium_lifetime';

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

export async function purchasePremium(): Promise<void> {
  const store = await iap();
  await store.initConnection();
  try {
    const products = await store.fetchProducts({
      skus: [PREMIUM_PRODUCT_ID],
      type: 'in-app'
    });
    if (!products?.length) {
      throw new Error('The premium product is not available for this Play account yet.');
    }
    const purchase = await store.requestPurchase({
      request: {
        android: { skus: [PREMIUM_PRODUCT_ID] },
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
      await verifyGooglePurchase(PREMIUM_PRODUCT_ID, token);
    }
    await store.finishTransaction({ purchase: first, isConsumable: false });
  } finally {
    await store.endConnection();
  }
}

export async function restorePurchases(): Promise<void> {
  const store = await iap();
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
      await verifyGooglePurchase(PREMIUM_PRODUCT_ID, token);
    }
  } finally {
    await store.endConnection();
  }
}
