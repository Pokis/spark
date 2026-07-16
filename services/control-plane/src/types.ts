import type { AdminRole, AppConfig } from '@spark/cloud-contracts';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  adminRole?: AdminRole;
}

export interface SupportThreadRecord {
  id: string;
  ownerId: string;
  subject: string;
  status: 'open' | 'waiting_on_user' | 'resolved';
  createdAt: string;
  lastMessageAt: string;
  unreadByUser: number;
  unreadByAdmin: number;
  appVersion: string;
  platform: 'android' | 'ios';
}

export interface SupportMessageRecord {
  id: string;
  author: 'user' | 'admin';
  authorId: string;
  text: string;
  createdAt: string;
}

export interface EntitlementRecord {
  premium: boolean;
  source: 'none' | 'play' | 'app-store' | 'promo' | 'admin';
  productId?: string;
  expiresAt: string | null;
  updatedAt: string;
}

export interface AdminUserRecord {
  uid: string;
  email?: string;
  createdAt: string;
  lastSeenAt: string;
  platform?: string;
  appVersion?: string;
  entitlement?: EntitlementRecord;
}

export interface PromoCodeRecord {
  id: string;
  code: string;
  campaign: string;
  productId: string;
  status: 'available' | 'assigned';
  importedAt: string;
  assignedAt?: string;
  assignedTo?: string;
}

export interface AuditRecord {
  id: string;
  actorId: string;
  action: string;
  target: string;
  reason?: string;
  at: string;
  metadata?: Record<string, unknown>;
}

export interface Store {
  getConfig(): Promise<AppConfig | null>;
  setConfig(config: AppConfig): Promise<void>;
  touchUser(
    uid: string,
    data: { email?: string; platform?: string; appVersion?: string; at: string }
  ): Promise<void>;
  createSupportThread(
    thread: SupportThreadRecord,
    message: SupportMessageRecord
  ): Promise<void>;
  listUserSupportThreads(uid: string, limit: number): Promise<SupportThreadRecord[]>;
  getSupportThread(id: string): Promise<SupportThreadRecord | null>;
  listSupportThreads(
    status: SupportThreadRecord['status'] | undefined,
    limit: number
  ): Promise<SupportThreadRecord[]>;
  listSupportMessages(threadId: string, limit: number): Promise<SupportMessageRecord[]>;
  addSupportMessage(
    threadId: string,
    message: SupportMessageRecord,
    next: Partial<SupportThreadRecord>
  ): Promise<void>;
  updateSupportThread(id: string, updates: Partial<SupportThreadRecord>): Promise<void>;
  getEntitlement(uid: string): Promise<EntitlementRecord | null>;
  setEntitlement(uid: string, entitlement: EntitlementRecord): Promise<void>;
  listUsers(limit: number): Promise<AdminUserRecord[]>;
  overview(): Promise<{ users: number; openSupport: number; premium: number }>;
  importPromoCodes(codes: PromoCodeRecord[]): Promise<number>;
  assignPromoCode(uid: string, now: string): Promise<PromoCodeRecord | null>;
  listPromoCodes(limit: number): Promise<PromoCodeRecord[]>;
  writeAudit(record: AuditRecord): Promise<void>;
  deleteUserData(uid: string): Promise<void>;
}

export interface AuthService {
  verify(token: string): Promise<AuthenticatedUser>;
  setRole(email: string, role: AdminRole): Promise<{ uid: string; email: string }>;
  deleteUser(uid: string): Promise<void>;
}

export interface PurchaseVerifier {
  verifyProduct(input: {
    productId: string;
    purchaseToken: string;
  }): Promise<{ valid: boolean; acknowledged: boolean; orderId?: string }>;
}

export interface Dependencies {
  store: Store;
  auth: AuthService;
  purchases: PurchaseVerifier;
  now(): Date;
  id(prefix: string): string;
  adminEmailAllowlist: string[];
  allowedOrigins: string[];
}
