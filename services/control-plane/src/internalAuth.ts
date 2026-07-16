import { OAuth2Client } from 'google-auth-library';
import type { InternalAuthService } from './types.js';

export class GoogleOidcInternalAuthService implements InternalAuthService {
  private readonly client = new OAuth2Client();

  constructor(
    private readonly audience: string,
    private readonly expectedServiceAccount: string
  ) {}

  async verify(token: string): Promise<void> {
    if (!this.audience || !this.expectedServiceAccount) {
      throw new Error('Internal OIDC authentication is not configured.');
    }
    const ticket = await this.client.verifyIdToken({
      idToken: token,
      audience: this.audience
    });
    const payload = ticket.getPayload();
    if (
      !payload?.email_verified ||
      payload.email?.toLowerCase() !== this.expectedServiceAccount.toLowerCase()
    ) {
      throw new Error('Internal caller identity is not allowed.');
    }
  }
}
