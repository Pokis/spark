import { defaultAppConfig, type AdminRole, type AppConfig } from '@spark/cloud-contracts';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import type {
  AdminUserRecord,
  AuditRecord,
  AuthService,
  AuthenticatedUser,
  Dependencies,
  EntitlementRecord,
  PromoCodeRecord,
  PurchaseVerifier,
  Store,
  SupportMessageRecord,
  SupportThreadRecord
} from '../src/types';

class MemoryStore implements Store {
  config: AppConfig | null = null;
  threads = new Map<string, SupportThreadRecord>();
  messages = new Map<string, SupportMessageRecord[]>();
  entitlements = new Map<string, EntitlementRecord>();
  users = new Map<string, AdminUserRecord>();
  promos: PromoCodeRecord[] = [];
  audits: AuditRecord[] = [];

  async getConfig() {
    return this.config;
  }
  async setConfig(config: AppConfig) {
    this.config = config;
  }
  async touchUser(
    uid: string,
    data: { email?: string; platform?: string; appVersion?: string; at: string }
  ) {
    this.users.set(uid, {
      uid,
      createdAt: this.users.get(uid)?.createdAt ?? data.at,
      lastSeenAt: data.at,
      ...data
    });
  }
  async createSupportThread(
    thread: SupportThreadRecord,
    message: SupportMessageRecord
  ) {
    this.threads.set(thread.id, thread);
    this.messages.set(thread.id, [message]);
  }
  async listUserSupportThreads(uid: string, limit: number) {
    return [...this.threads.values()].filter((thread) => thread.ownerId === uid).slice(0, limit);
  }
  async getSupportThread(id: string) {
    return this.threads.get(id) ?? null;
  }
  async listSupportThreads(
    status: SupportThreadRecord['status'] | undefined,
    limit: number
  ) {
    return [...this.threads.values()]
      .filter((thread) => !status || thread.status === status)
      .slice(0, limit);
  }
  async listSupportMessages(threadId: string, limit: number) {
    return (this.messages.get(threadId) ?? []).slice(0, limit);
  }
  async addSupportMessage(
    threadId: string,
    message: SupportMessageRecord,
    next: Partial<SupportThreadRecord>
  ) {
    this.messages.set(threadId, [...(this.messages.get(threadId) ?? []), message]);
    const current = this.threads.get(threadId);
    if (current) this.threads.set(threadId, { ...current, ...next });
  }
  async updateSupportThread(id: string, updates: Partial<SupportThreadRecord>) {
    const current = this.threads.get(id);
    if (current) this.threads.set(id, { ...current, ...updates });
  }
  async getEntitlement(uid: string) {
    return this.entitlements.get(uid) ?? null;
  }
  async setEntitlement(uid: string, entitlement: EntitlementRecord) {
    this.entitlements.set(uid, entitlement);
  }
  async listUsers(limit: number) {
    return [...this.users.values()].slice(0, limit);
  }
  async overview() {
    return {
      users: this.users.size,
      openSupport: [...this.threads.values()].filter((thread) => thread.status !== 'resolved')
        .length,
      premium: [...this.entitlements.values()].filter((value) => value.premium).length
    };
  }
  async importPromoCodes(codes: PromoCodeRecord[]) {
    this.promos.push(...codes);
    return codes.length;
  }
  async assignPromoCode(uid: string, now: string) {
    const code = this.promos.find((item) => item.status === 'available');
    if (!code) return null;
    Object.assign(code, { status: 'assigned', assignedTo: uid, assignedAt: now });
    return code;
  }
  async listPromoCodes(limit: number) {
    return this.promos.slice(0, limit);
  }
  async writeAudit(record: AuditRecord) {
    this.audits.push(record);
  }
  async deleteUserData(uid: string) {
    this.users.delete(uid);
    this.entitlements.delete(uid);
    for (const [id, thread] of this.threads) {
      if (thread.ownerId === uid) {
        this.threads.delete(id);
        this.messages.delete(id);
      }
    }
  }
}

class TestAuth implements AuthService {
  users: Record<string, AuthenticatedUser> = {
    user: { uid: 'user-1' },
    other: { uid: 'user-2' },
    owner: { uid: 'owner-1', email: 'owner@example.com', adminRole: 'owner' },
    support: { uid: 'support-1', adminRole: 'support' }
  };
  async verify(token: string) {
    const user = this.users[token];
    if (!user) throw new Error('invalid');
    return user;
  }
  async setRole(email: string, role: AdminRole) {
    return { uid: `uid-${role}`, email };
  }
  async deleteUser() {}
}

class TestPurchases implements PurchaseVerifier {
  async verifyProduct() {
    return { valid: true, acknowledged: true, orderId: 'order-1' };
  }
}

function setup() {
  const store = new MemoryStore();
  let id = 0;
  const dependencies: Dependencies = {
    store,
    auth: new TestAuth(),
    purchases: new TestPurchases(),
    now: () => new Date('2026-07-16T12:00:00.000Z'),
    id: (prefix) => `${prefix}-${++id}`,
    adminEmailAllowlist: [],
    allowedOrigins: ['http://localhost:5173']
  };
  return {
    store,
    app: createApp(dependencies, { premiumProductId: 'spark_premium_lifetime' })
  };
}

describe('Spark control plane', () => {
  it('serves baked defaults without authentication or database setup', async () => {
    const { app } = setup();
    const response = await request(app).get('/v1/config').expect(200);
    expect(response.body).toEqual(defaultAppConfig);
    expect(response.headers['cache-control']).toContain('max-age=300');
  });

  it('keeps support threads private to their owner', async () => {
    const { app } = setup();
    const created = await request(app)
      .post('/v1/support/threads')
      .set('Authorization', 'Bearer user')
      .send({
        subject: 'A rough edge',
        message: 'I got stuck here.',
        appVersion: '0.1.0',
        platform: 'android'
      })
      .expect(201);
    await request(app)
      .get(`/v1/support/threads/${created.body.id}/messages`)
      .set('Authorization', 'Bearer other')
      .expect(404);
    const own = await request(app)
      .get(`/v1/support/threads/${created.body.id}/messages`)
      .set('Authorization', 'Bearer user')
      .expect(200);
    expect(own.body[0].text).toBe('I got stuck here.');
  });

  it('validates purchase server-side before granting premium', async () => {
    const { app, store } = setup();
    const response = await request(app)
      .post('/v1/purchases/google/verify')
      .set('Authorization', 'Bearer user')
      .send({
        productId: 'spark_premium_lifetime',
        purchaseToken: 'a-valid-looking-purchase-token'
      })
      .expect(200);
    expect(response.body.premium).toBe(true);
    expect(store.entitlements.get('user-1')?.source).toBe('play');
    expect(store.audits[0]?.action).toBe('purchase.verified');
  });

  it('prevents support admins from manually granting premium', async () => {
    const { app } = setup();
    await request(app)
      .post('/v1/admin/users/user-1/entitlement')
      .set('Authorization', 'Bearer support')
      .send({ premium: true, reason: 'Requested by owner' })
      .expect(403);
  });

  it('allows an owner grant and records its reason in the audit log', async () => {
    const { app, store } = setup();
    await request(app)
      .post('/v1/admin/users/user-1/entitlement')
      .set('Authorization', 'Bearer owner')
      .send({ premium: true, reason: 'Accessibility testing group' })
      .expect(200);
    expect(store.entitlements.get('user-1')?.source).toBe('admin');
    expect(store.audits[0]?.reason).toBe('Accessibility testing group');
  });

  it('imports and assigns official promo codes only through admin roles', async () => {
    const { app, store } = setup();
    await request(app)
      .post('/v1/admin/promo-codes/import')
      .set('Authorization', 'Bearer owner')
      .send({
        codes: ['PLAY-CODE-0001', 'PLAY-CODE-0002'],
        campaign: 'Launch testers',
        productId: 'spark_premium_lifetime'
      })
      .expect(201);
    const assigned = await request(app)
      .post('/v1/admin/promo-codes/assign')
      .set('Authorization', 'Bearer support')
      .send({ userId: 'user-1' })
      .expect(200);
    expect(assigned.body.code).toBe('PLAY-CODE-0001');
    expect(store.promos[0]?.assignedTo).toBe('user-1');
  });

  it('rejects malformed app configuration', async () => {
    const { app } = setup();
    await request(app)
      .post('/v1/admin/config')
      .set('Authorization', 'Bearer owner')
      .send({ schemaVersion: 1 })
      .expect(400);
  });

  it('lets a user delete optional cloud data and identity', async () => {
    const { app, store } = setup();
    await store.touchUser('user-1', { at: '2026-07-16T12:00:00.000Z' });
    await request(app)
      .delete('/v1/me')
      .set('Authorization', 'Bearer user')
      .expect(204);
    expect(store.users.has('user-1')).toBe(false);
  });
});
