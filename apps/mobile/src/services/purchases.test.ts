import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { cloudUserId } from './cloudAuth';
import { verifyGooglePurchase } from './api';
import {
  PREMIUM_PRODUCT_ID,
  premiumDisplayPrice,
  purchasePremium,
  purchasesSupportedOnPlatform,
  restorePurchases
} from './purchases';

jest.mock('./cloudAuth', () => ({
  cloudUserId: jest.fn(async () => 'cloud-user')
}));

jest.mock('./api', () => ({
  verifyGooglePurchase: jest.fn(async () => ({
    premium: true,
    source: 'play',
    expiresAt: null
  }))
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async () => 'hashed-cloud-user')
}));

function store(overrides: Record<string, unknown> = {}) {
  return {
    initConnection: jest.fn(async () => true),
    endConnection: jest.fn(async () => undefined),
    fetchProducts: jest.fn(async () => [
      { productId: PREMIUM_PRODUCT_ID, displayPrice: '$4.99' }
    ]),
    requestPurchase: jest.fn(async () => ({
      productId: PREMIUM_PRODUCT_ID,
      purchaseToken: 'play-token'
    })),
    finishTransaction: jest.fn(async () => undefined),
    getAvailablePurchases: jest.fn(async () => [
      { productId: PREMIUM_PRODUCT_ID, purchaseToken: 'restore-token' }
    ]),
    ...overrides
  } as any;
}

describe('Play purchase client lifecycle', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android'
    });
    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(
      'hashed-cloud-user'
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform
    });
  });

  it('keeps iPhone purchases disabled until server verification exists', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    expect(purchasesSupportedOnPlatform()).toBe(false);
    await expect(premiumDisplayPrice(async () => store())).resolves.toBeNull();
    await expect(purchasePremium(async () => store())).rejects.toThrow(
      'iPhone purchases are disabled'
    );
    await expect(restorePurchases(async () => store())).rejects.toThrow(
      'iPhone purchase restore is disabled'
    );
  });

  it('reads the localized Play price and always closes the connection', async () => {
    const fake = store();
    await expect(premiumDisplayPrice(async () => fake)).resolves.toBe('$4.99');
    expect(fake.fetchProducts).toHaveBeenCalledWith({
      skus: [PREMIUM_PRODUCT_ID],
      type: 'in-app'
    });
    expect(fake.endConnection).toHaveBeenCalled();
  });

  it('binds, verifies, and finishes a new Android purchase', async () => {
    const fake = store();
    await purchasePremium(async () => fake);
    expect(cloudUserId).toHaveBeenCalled();
    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      'cloud-user'
    );
    expect(fake.requestPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          android: {
            skus: [PREMIUM_PRODUCT_ID],
            obfuscatedAccountId: 'hashed-cloud-user'
          }
        })
      })
    );
    expect(verifyGooglePurchase).toHaveBeenCalledWith(
      PREMIUM_PRODUCT_ID,
      'play-token',
      false
    );
    expect(fake.finishTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ isConsumable: false })
    );
    expect(fake.endConnection).toHaveBeenCalled();
  });

  it('rejects unavailable products/tokens but still closes the store', async () => {
    const noProduct = store({ fetchProducts: jest.fn(async () => []) });
    await expect(purchasePremium(async () => noProduct)).rejects.toThrow(
      'premium product is not available'
    );
    expect(noProduct.endConnection).toHaveBeenCalled();

    const noToken = store({
      requestPurchase: jest.fn(async () => ({ productId: PREMIUM_PRODUCT_ID }))
    });
    await expect(purchasePremium(async () => noToken)).rejects.toThrow(
      'purchase token was missing'
    );
    expect(noToken.endConnection).toHaveBeenCalled();
  });

  it('restores only the premium product and verifies it as a transfer', async () => {
    const fake = store();
    await restorePurchases(async () => fake);
    expect(verifyGooglePurchase).toHaveBeenCalledWith(
      PREMIUM_PRODUCT_ID,
      'restore-token',
      true
    );
    expect(fake.endConnection).toHaveBeenCalled();

    const none = store({ getAvailablePurchases: jest.fn(async () => []) });
    await expect(restorePurchases(async () => none)).rejects.toThrow(
      'No previous Spark premium purchase'
    );
    expect(none.endConnection).toHaveBeenCalled();
  });
});
