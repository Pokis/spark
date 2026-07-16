import { google } from 'googleapis';
import type { PurchaseVerifier } from './types.js';

export class GooglePlayPurchaseVerifier implements PurchaseVerifier {
  constructor(
    private readonly packageName: string
  ) {}

  async verifyProduct(input: {
    productId: string;
    purchaseToken: string;
  }): Promise<{ valid: boolean; acknowledged: boolean; orderId?: string }> {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });
    const androidpublisher = google.androidpublisher({
      version: 'v3',
      auth
    });
    const result = await androidpublisher.purchases.products.get({
      packageName: this.packageName,
      productId: input.productId,
      token: input.purchaseToken
    });
    const valid = result.data.purchaseState === 0;
    const acknowledged = result.data.acknowledgementState === 1;
    if (valid && !acknowledged) {
      await androidpublisher.purchases.products.acknowledge({
        packageName: this.packageName,
        productId: input.productId,
        token: input.purchaseToken,
        requestBody: {}
      });
    }
    return {
      valid,
      acknowledged: acknowledged || valid,
      orderId: result.data.orderId ?? undefined
    };
  }
}
