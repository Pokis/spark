import type { AdminRole } from '@spark/cloud-contracts';
import { getAuth } from 'firebase-admin/auth';
import type { AuthService, AuthenticatedUser } from './types.js';

export class FirebaseAuthService implements AuthService {
  async verify(token: string): Promise<AuthenticatedUser> {
    const decoded = await getAuth().verifyIdToken(token, true);
    const role = decoded.adminRole as AdminRole | undefined;
    return {
      uid: decoded.uid,
      email: decoded.email,
      adminRole: role
    };
  }

  async setRole(email: string, role: AdminRole): Promise<{ uid: string; email: string }> {
    const user = await getAuth().getUserByEmail(email);
    const existing = user.customClaims ?? {};
    const next = { ...existing };
    if (role === 'none') delete next.adminRole;
    else next.adminRole = role;
    await getAuth().setCustomUserClaims(user.uid, next);
    return { uid: user.uid, email };
  }

  async deleteUser(uid: string): Promise<void> {
    await getAuth().deleteUser(uid);
  }
}
