import { google } from 'googleapis';
import type { PurchaseVerifier } from './types.js';

export class GooglePlayPurchaseVerifier implements PurchaseVerifier {
  constructor(
    private readonly packageName: string
  ) {}

  async verifyProduct(input: {
    productId: string;
    purchaseToken: string;
  }): Promise<{
    state: 'purchased' | 'pending' | 'canceled';
    acknowledged: boolean;
    orderId?: string;
    obfuscatedAccountId?: string;
  }> {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const androidpublisher = google.androidpublisher({
      version: 'v3',
      auth
    });
    const result =
      await androidpublisher.purchases.productsv2.getproductpurchasev2({
      packageName: this.packageName,
        token: input.purchaseToken
      });
    const containsExpectedProduct = result.data.productLineItem?.some(
      (lineItem) => lineItem.productId === input.productId
    );
    if (!containsExpectedProduct) {
      throw new Error('Google Play confirmed a different product for this token.');
    }
    const purchaseState = result.data.purchaseStateContext?.purchaseState;
    const state =
      purchaseState === 'PURCHASED'
        ? 'purchased'
        : purchaseState === 'PENDING'
          ? 'pending'
          : 'canceled';
    const acknowledged = result.data.acknowledgementState === 'ACKNOWLEDGED';
    if (state === 'purchased' && !acknowledged) {
      await androidpublisher.purchases.products.acknowledge({
        packageName: this.packageName,
        productId: input.productId,
        token: input.purchaseToken,
        requestBody: {}
      });
    }
    return {
      state,
      acknowledged: acknowledged || state === 'purchased',
      orderId: result.data.orderId ?? undefined,
      obfuscatedAccountId:
        result.data.obfuscatedExternalAccountId ?? undefined
    };
  }
}
