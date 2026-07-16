export type Page =
  | 'overview'
  | 'support'
  | 'users'
  | 'config'
  | 'promos'
  | 'audits'
  | 'admins';

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
}

export interface Overview {
  users: number;
  openSupport: number;
  premium: number;
}

export interface SupportThread {
  id: string;
  ownerId: string;
  subject: string;
  status: 'open' | 'waiting_on_user' | 'resolved';
  createdAt: string;
  lastMessageAt: string;
  unreadByAdmin: number;
  appVersion: string;
  platform: string;
}

export interface SupportMessage {
  id: string;
  author: 'user' | 'admin';
  text: string;
  createdAt: string;
}

export interface AdminUser {
  uid: string;
  email?: string;
  createdAt: string;
  lastSeenAt: string;
  platform?: string;
  appVersion?: string;
  entitlement?: {
    premium: boolean;
    source: string;
    expiresAt: string | null;
  };
}

export interface PromoCode {
  id: string;
  code: string;
  campaign: string;
  productId: string;
  status: 'available' | 'assigned';
  importedAt: string;
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
