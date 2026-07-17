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
  InternalEventRecord,
  PageRequest,
  PlayPurchaseRecord,
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
  purchases = new Map<string, PlayPurchaseRecord>();
  internalEvents = new Map<string, InternalEventRecord>();

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
    page: PageRequest
  ) {
    const items = [...this.threads.values()]
      .filter((thread) => !status || thread.status === status)
      .slice(0, page.limit);
    return { items, nextCursor: null };
  }
  async listSupportMessages(threadId: string, limit: number) {
    return (this.messages.get(threadId) ?? []).slice(0, limit);
  }
  async listSupportMessagesPage(threadId: string, page: PageRequest) {
    return {
      items: (this.messages.get(threadId) ?? []).slice(0, page.limit),
      nextCursor: null
    };
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
  async claimPlayPurchase(input: {
    purchase: PlayPurchaseRecord;
    entitlement?: EntitlementRecord;
    allowTransfer: boolean;
  }) {
    const existing = this.purchases.get(input.purchase.tokenHash);
    if (
      existing &&
      existing.ownerId !== input.purchase.ownerId &&
      !input.allowTransfer
    ) {
      return { status: 'conflict' as const, previousOwnerId: existing.ownerId };
    }
    const previousOwnerId =
      existing && existing.ownerId !== input.purchase.ownerId
        ? existing.ownerId
        : undefined;
    if (previousOwnerId) this.entitlements.set(previousOwnerId, {
      premium: false,
      source: 'play',
      expiresAt: null,
      updatedAt: input.purchase.updatedAt
    });
    this.purchases.set(input.purchase.tokenHash, input.purchase);
    if (input.entitlement) {
      this.entitlements.set(input.purchase.ownerId, input.entitlement);
    }
    return previousOwnerId
      ? { status: 'transferred' as const, previousOwnerId }
      : existing
        ? { status: 'existing' as const }
        : { status: 'claimed' as const };
  }
  async revokePlayPurchase(input: {
    tokenHash: string;
    orderIdHash?: string;
    reason: string;
    at: string;
  }) {
    const purchase = this.purchases.get(input.tokenHash);
    if (!purchase) return { changed: false };
    const changed = purchase.state === 'active';
    this.purchases.set(input.tokenHash, {
      ...purchase,
      state: 'revoked',
      revokeReason: input.reason,
      updatedAt: input.at
    });
    const entitlement = this.entitlements.get(purchase.ownerId);
    if (entitlement?.source === 'play') {
      this.entitlements.set(purchase.ownerId, {
        ...entitlement,
        premium: false,
        updatedAt: input.at
      });
    }
    return { ownerId: purchase.ownerId, changed };
  }
  async reconcilePlayPurchase(input: {
    tokenHash: string;
    orderIdHash?: string;
    productId: string;
    state: 'purchased' | 'pending' | 'canceled';
    at: string;
  }) {
    if (input.state === 'canceled') {
      return this.revokePlayPurchase({
        tokenHash: input.tokenHash,
        orderIdHash: input.orderIdHash,
        reason: 'canceled',
        at: input.at
      });
    }
    const purchase = this.purchases.get(input.tokenHash);
    if (!purchase) return { changed: false };
    const nextState = input.state === 'purchased' ? 'active' : 'pending';
    const changed = purchase.state !== nextState;
    this.purchases.set(input.tokenHash, {
      ...purchase,
      state: nextState,
      updatedAt: input.at
    });
    if (input.state === 'purchased') {
      this.entitlements.set(purchase.ownerId, {
        premium: true,
        source: 'play',
        productId: input.productId,
        expiresAt: null,
        updatedAt: input.at
      });
    }
    return { ownerId: purchase.ownerId, changed };
  }
  async listUsers(page: PageRequest & { search?: string }) {
    const items = [...this.users.values()]
      .filter(
        (user) =>
          !page.search ||
          user.uid === page.search ||
          user.email?.toLowerCase() === page.search.toLowerCase()
      )
      .slice(0, page.limit);
    return { items, nextCursor: null };
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
  async listPromoCodes(page: PageRequest) {
    return { items: this.promos.slice(0, page.limit), nextCursor: null };
  }
  async listAudits(page: PageRequest & {
    action?: string;
    actorId?: string;
    target?: string;
  }) {
    return {
      items: this.audits
        .filter(
          (audit) =>
            (!page.action || audit.action === page.action) &&
            (!page.actorId || audit.actorId === page.actorId) &&
            (!page.target || audit.target === page.target)
        )
        .slice(0, page.limit),
      nextCursor: null
    };
  }
  async writeAudit(record: AuditRecord) {
    this.audits.push(record);
  }
  async claimInternalEvent(record: InternalEventRecord) {
    if (this.internalEvents.has(record.id)) return false;
    this.internalEvents.set(record.id, record);
    return true;
  }
  async releaseInternalEvent(id: string) {
    this.internalEvents.delete(id);
  }
  async purgeExpired(now: string) {
    let supportThreads = 0;
    let audits = 0;
    let internalEvents = 0;
    for (const [id, thread] of this.threads) {
      if (thread.deleteAfter <= now) {
        this.threads.delete(id);
        supportThreads += 1;
      }
    }
    this.audits = this.audits.filter((audit) => {
      if (audit.deleteAfter <= now) {
        audits += 1;
        return false;
      }
      return true;
    });
    for (const [id, event] of this.internalEvents) {
      if (event.deleteAfter <= now) {
        this.internalEvents.delete(id);
        internalEvents += 1;
      }
    }
    return { supportThreads, audits, internalEvents };
  }
  async healthCheck() {}
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
  calls = 0;
  failuresRemaining = 0;
  obfuscatedAccountId?: string;
  async verifyProduct(): ReturnType<PurchaseVerifier['verifyProduct']> {
    this.calls += 1;
    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      throw new Error('temporary Google API failure');
    }
    return {
      state: 'purchased' as const,
      acknowledged: true,
      orderId: 'order-1',
      obfuscatedAccountId: this.obfuscatedAccountId
    };
  }
}

function setup({ enabled = true }: { enabled?: boolean } = {}) {
  const store = new MemoryStore();
  if (enabled) {
    store.config = {
      ...defaultAppConfig,
      defaults: {
        ...defaultAppConfig.defaults,
        announcementsEnabled: true,
        supportEnabled: true,
        purchasesEnabled: true,
        userReviewEnabled: true,
        manualGrantsEnabled: true,
        promoCodesEnabled: true,
        adminRolesEnabled: true
      }
    };
  }
  let id = 0;
  const purchases = new TestPurchases();
  const dependencies: Dependencies = {
    store,
    auth: new TestAuth(),
    purchases,
    internalAuth: {
      async verify(token: string) {
        if (token !== 'internal') throw new Error('invalid');
      }
    },
    now: () => new Date('2026-07-16T12:00:00.000Z'),
    id: (prefix) => `${prefix}-${++id}`,
    adminEmailAllowlist: [],
    allowedOrigins: ['http://localhost:5173']
  };
  return {
    store,
    purchases,
    app: createApp(dependencies, {
      premiumProductId: 'spark_premium_lifetime',
      packageName: 'com.djpokis.sparkhabits.app'
    })
  };
}

function pubSubBody(messageId: string, notification: Record<string, unknown>) {
  return {
    message: {
      messageId,
      data: Buffer.from(JSON.stringify(notification)).toString('base64')
    }
  };
}

describe('Spark control plane', () => {
  it('serves baked defaults without authentication or database setup', async () => {
    const { app } = setup({ enabled: false });
    const response = await request(app).get('/v1/config').expect(200);
    expect(response.body).toEqual(defaultAppConfig);
    expect(response.headers['cache-control']).toContain('max-age=300');
  });

  it('keeps cost-bearing admin operations disabled while config remains reachable', async () => {
    const { app } = setup({ enabled: false });
    await request(app)
      .get('/v1/admin/users')
      .set('Authorization', 'Bearer owner')
      .expect(503);
    await request(app)
      .post('/v1/admin/users/user-1/entitlement')
      .set('Authorization', 'Bearer owner')
      .send({ premium: true, reason: 'Testing disabled controls' })
      .expect(503);
    await request(app)
      .post('/v1/admin/config')
      .set('Authorization', 'Bearer owner')
      .send({
        ...defaultAppConfig,
        updatedAt: undefined
      })
      .expect(200);
  });

  it('fills new cost switches with false when reading a legacy config document', async () => {
    const { app, store } = setup({ enabled: false });
    store.config = {
      schemaVersion: 1,
      updatedAt: '2026-07-15T00:00:00.000Z',
      announcements: [],
      features: {},
      defaults: {
        maxDailyHabitNotifications: 4,
        focusMinutes: [5, 10, 25, 50],
        supportEnabled: true,
        purchasesEnabled: true
      }
    } as unknown as AppConfig;
    const response = await request(app).get('/v1/config').expect(200);
    expect(response.body.defaults).toMatchObject({
      supportEnabled: true,
      purchasesEnabled: true,
      announcementsEnabled: false,
      userReviewEnabled: false,
      manualGrantsEnabled: false,
      promoCodesEnabled: false,
      adminRolesEnabled: false
    });
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

  it('enforces support and purchase shutdowns in the API', async () => {
    const { app, purchases } = setup({ enabled: false });
    await request(app)
      .post('/v1/support/threads')
      .set('Authorization', 'Bearer user')
      .send({
        subject: 'A rough edge',
        message: 'I got stuck here.',
        appVersion: '0.1.0',
        platform: 'android'
      })
      .expect(503);
    await request(app)
      .post('/v1/purchases/google/verify')
      .set('Authorization', 'Bearer user')
      .send({
        productId: 'spark_premium_lifetime',
        purchaseToken: 'a-valid-looking-purchase-token'
      })
      .expect(503);
    expect(purchases.calls).toBe(0);
  });

  it('prevents a purchase token from granting two active identities', async () => {
    const { app, store } = setup();
    const body = {
      productId: 'spark_premium_lifetime',
      purchaseToken: 'one-token-that-cannot-be-shared'
    };
    await request(app)
      .post('/v1/purchases/google/verify')
      .set('Authorization', 'Bearer user')
      .send(body)
      .expect(200);
    await request(app)
      .post('/v1/purchases/google/verify')
      .set('Authorization', 'Bearer other')
      .send(body)
      .expect(409);
    expect(store.entitlements.get('user-1')?.premium).toBe(true);
    expect(store.entitlements.get('user-2')).toBeUndefined();
  });

  it('makes repeated verification idempotent and audits it as a duplicate', async () => {
    const { app, store } = setup();
    const body = {
      productId: 'spark_premium_lifetime',
      purchaseToken: 'one-token-for-idempotent-verification'
    };
    await request(app)
      .post('/v1/purchases/google/verify')
      .set('Authorization', 'Bearer user')
      .send(body)
      .expect(200);
    await request(app)
      .post('/v1/purchases/google/verify')
      .set('Authorization', 'Bearer user')
      .send(body)
      .expect(200);
    expect(
      store.audits.some((audit) => audit.action === 'purchase.duplicate')
    ).toBe(true);
  });

  it('rejects a Play account binding mismatch unless Restore is explicit', async () => {
    const { app, store, purchases } = setup();
    purchases.obfuscatedAccountId = 'user-1';
    await request(app)
      .post('/v1/purchases/google/verify')
      .set('Authorization', 'Bearer other')
      .send({
        productId: 'spark_premium_lifetime',
        purchaseToken: 'token-with-another-obfuscated-owner'
      })
      .expect(409);
    expect(store.entitlements.get('user-2')).toBeUndefined();
    expect(
      store.audits.some((audit) => audit.action === 'purchase.account_mismatch')
    ).toBe(true);
  });

  it('atomically transfers the single entitlement during explicit restore', async () => {
    const { app, store } = setup();
    const body = {
      productId: 'spark_premium_lifetime',
      purchaseToken: 'one-token-for-an-explicit-restore'
    };
    await request(app)
      .post('/v1/purchases/google/verify')
      .set('Authorization', 'Bearer user')
      .send(body)
      .expect(200);
    await request(app)
      .post('/v1/purchases/google/verify')
      .set('Authorization', 'Bearer other')
      .send({ ...body, restore: true })
      .expect(200);
    expect(store.entitlements.get('user-1')?.premium).toBe(false);
    expect(store.entitlements.get('user-2')?.premium).toBe(true);
    const transferredAudit = store.audits.find(
      (audit) => audit.action === 'purchase.transferred'
    );
    expect(transferredAudit?.metadata).toEqual({
      productId: 'spark_premium_lifetime',
      transferredFromAnotherIdentity: true
    });
  });

  it('revokes a bound entitlement from an authenticated Google Play RTDN', async () => {
    const { app, store } = setup();
    const purchaseToken = 'a-token-that-will-be-refunded';
    await request(app)
      .post('/v1/purchases/google/verify')
      .set('Authorization', 'Bearer user')
      .send({
        productId: 'spark_premium_lifetime',
        purchaseToken
      })
      .expect(200);
    const notification = {
      packageName: 'com.djpokis.sparkhabits.app',
      voidedPurchaseNotification: {
        purchaseToken,
        orderId: 'order-1',
        productType: 2,
        refundType: 1
      }
    };
    const envelope = {
      message: {
        messageId: 'message-1',
        data: Buffer.from(JSON.stringify(notification)).toString('base64')
      }
    };
    await request(app)
      .post('/v1/internal/google-play/rtdn')
      .set('Authorization', 'Bearer internal')
      .send(envelope)
      .expect(204);
    expect(store.entitlements.get('user-1')?.premium).toBe(false);
    expect(store.audits.some((audit) => audit.action === 'purchase.voided')).toBe(
      true
    );
    await request(app)
      .post('/v1/internal/google-play/rtdn')
      .set('Authorization', 'Bearer internal')
      .send(envelope)
      .expect(204);
    expect(
      store.audits.filter((audit) => audit.action === 'purchase.voided')
    ).toHaveLength(1);
  });

  it('releases an RTDN event after a transient failure so Pub/Sub can retry', async () => {
    const { app, purchases } = setup();
    purchases.failuresRemaining = 1;
    const body = pubSubBody('retryable-event', {
      packageName: 'com.djpokis.sparkhabits.app',
      oneTimeProductNotification: {
        notificationType: 1,
        purchaseToken: 'a-retryable-purchase-token',
        sku: 'spark_premium_lifetime'
      }
    });
    await request(app)
      .post('/v1/internal/google-play/rtdn')
      .set('Authorization', 'Bearer internal')
      .send(body)
      .expect(500);
    await request(app)
      .post('/v1/internal/google-play/rtdn')
      .set('Authorization', 'Bearer internal')
      .send(body)
      .expect(204);
    expect(purchases.calls).toBe(2);
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

  it('returns 404 instead of creating a missing support thread during status changes', async () => {
    const { app } = setup();
    await request(app)
      .patch('/v1/admin/support/missing/status')
      .set('Authorization', 'Bearer support')
      .send({ status: 'resolved' })
      .expect(404);
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

  it('reports liveness/readiness and bounded auth/not-found failures', async () => {
    const { app, store } = setup();
    await request(app)
      .get('/healthz')
      .expect(200, { ok: true, service: 'spark-control-plane' });
    await request(app)
      .get('/readyz')
      .expect(200, { ok: true, dependencies: { firestore: 'ready' } });
    await request(app).get('/v1/me/entitlement').expect(401);
    await request(app)
      .get('/v1/me/entitlement')
      .set('Authorization', 'Bearer invalid')
      .expect(401);
    await request(app)
      .get('/missing')
      .expect(404, { error: 'not_found', message: 'Endpoint not found.' });
    store.healthCheck = async () => {
      throw new Error('Firestore unavailable');
    };
    await request(app).get('/readyz').expect(500);
  });

  it('rejects unknown, pending, and canceled Play states without entitlement', async () => {
    const unknown = setup();
    await request(unknown.app)
      .post('/v1/purchases/google/verify')
      .set('Authorization', 'Bearer user')
      .send({
        productId: 'another_product',
        purchaseToken: 'a-valid-looking-purchase-token'
      })
      .expect(400);
    expect(
      unknown.store.audits.some(
        (audit) => audit.action === 'purchase.rejected_unknown_product'
      )
    ).toBe(true);

    const pending = setup();
    pending.purchases.verifyProduct = async () => ({
      state: 'pending',
      acknowledged: false
    });
    await request(pending.app)
      .post('/v1/purchases/google/verify')
      .set('Authorization', 'Bearer user')
      .send({
        productId: 'spark_premium_lifetime',
        purchaseToken: 'a-pending-purchase-token'
      })
      .expect(409);
    expect(pending.store.entitlements.get('user-1')).toBeUndefined();

    const canceled = setup();
    canceled.purchases.verifyProduct = async () => ({
      state: 'canceled',
      acknowledged: false
    });
    await request(canceled.app)
      .post('/v1/purchases/google/verify')
      .set('Authorization', 'Bearer user')
      .send({
        productId: 'spark_premium_lifetime',
        purchaseToken: 'a-canceled-purchase-token'
      })
      .expect(402);
    expect(
      canceled.store.audits.some(
        (audit) => audit.action === 'purchase.rejected'
      )
    ).toBe(true);
  });

  it('returns only currently active entitlement state', async () => {
    const { app, store } = setup();
    store.entitlements.set('user-1', {
      premium: true,
      source: 'admin',
      expiresAt: '2026-07-15T12:00:00.000Z',
      updatedAt: '2026-07-01T12:00:00.000Z'
    });
    const expired = await request(app)
      .get('/v1/me/entitlement')
      .set('Authorization', 'Bearer user')
      .expect(200);
    expect(expired.body).toEqual({
      premium: false,
      source: 'admin',
      expiresAt: '2026-07-15T12:00:00.000Z'
    });
    store.entitlements.set('user-1', {
      premium: true,
      source: 'admin',
      expiresAt: null,
      updatedAt: '2026-07-01T12:00:00.000Z'
    });
    const active = await request(app)
      .get('/v1/me/entitlement')
      .set('Authorization', 'Bearer user')
      .expect(200);
    expect(active.body.premium).toBe(true);
  });

  it('supports the complete private user/admin conversation lifecycle', async () => {
    const { app, store } = setup();
    const created = await request(app)
      .post('/v1/support/threads')
      .set('Authorization', 'Bearer user')
      .send({
        subject: 'Need help',
        message: 'First message',
        appVersion: '0.1.0',
        platform: 'android'
      })
      .expect(201);
    await request(app)
      .get('/v1/support/threads')
      .set('Authorization', 'Bearer user')
      .expect(200);
    await request(app)
      .post(`/v1/support/threads/${created.body.id}/messages`)
      .set('Authorization', 'Bearer user')
      .send({ text: 'More detail' })
      .expect(201);
    await request(app)
      .get('/v1/admin/support?status=open&limit=10')
      .set('Authorization', 'Bearer support')
      .expect(200);
    await request(app)
      .get(`/v1/admin/support/${created.body.id}/messages`)
      .set('Authorization', 'Bearer support')
      .expect(200);
    await request(app)
      .post(`/v1/admin/support/${created.body.id}/messages`)
      .set('Authorization', 'Bearer support')
      .send({ text: 'Admin reply' })
      .expect(201);
    expect(store.threads.get(created.body.id)?.status).toBe('waiting_on_user');
    await request(app)
      .patch(`/v1/admin/support/${created.body.id}/status`)
      .set('Authorization', 'Bearer support')
      .send({ status: 'resolved' })
      .expect(204);
    expect(store.threads.get(created.body.id)?.status).toBe('resolved');
    expect(store.audits.map((audit) => audit.action)).toEqual(
      expect.arrayContaining(['support.replied', 'support.status_changed'])
    );
  });

  it('returns bounded admin views and rejects costly or unauthorized audit filters', async () => {
    const { app, store } = setup();
    await store.touchUser('user-1', {
      email: 'person@example.com',
      at: '2026-07-16T12:00:00.000Z'
    });
    await request(app)
      .get('/v1/admin/overview')
      .set('Authorization', 'Bearer owner')
      .expect(200);
    const users = await request(app)
      .get('/v1/admin/users?limit=10&search=person%40example.com')
      .set('Authorization', 'Bearer support')
      .expect(200);
    expect(users.body.items[0].uid).toBe('user-1');
    await request(app)
      .get('/v1/admin/promo-codes?limit=10')
      .set('Authorization', 'Bearer support')
      .expect(200);
    await request(app)
      .get('/v1/admin/audits?limit=10&action=a&target=b')
      .set('Authorization', 'Bearer owner')
      .expect(400);
    await request(app)
      .get('/v1/admin/audits?limit=10&target=user-1')
      .set('Authorization', 'Bearer support')
      .expect(403);
  });

  it('handles empty promo inventory and owner role changes with audits', async () => {
    const { app, store } = setup();
    await request(app)
      .post('/v1/admin/promo-codes/assign')
      .set('Authorization', 'Bearer support')
      .send({ userId: 'user-1' })
      .expect(409);
    await request(app)
      .post('/v1/admin/roles')
      .set('Authorization', 'Bearer owner')
      .send({ email: 'new-admin@example.com', role: 'content' })
      .expect(200);
    expect(store.audits[0]).toMatchObject({
      action: 'admin.role_changed',
      reason: 'Role set to content'
    });
  });

  it('runs authenticated maintenance and ignores invalid RTDN payloads safely', async () => {
    const { app, store } = setup();
    store.audits.push({
      id: 'expired',
      actorId: 'owner',
      action: 'old',
      target: 'target',
      at: '2025-01-01T00:00:00.000Z',
      deleteAfter: '2026-01-01T00:00:00.000Z'
    });
    await request(app).post('/v1/internal/maintenance').expect(401);
    const maintenance = await request(app)
      .post('/v1/internal/maintenance')
      .set('Authorization', 'Bearer internal')
      .expect(200);
    expect(maintenance.body.purged.audits).toBe(1);
    await request(app)
      .post('/v1/internal/google-play/rtdn')
      .set('Authorization', 'Bearer internal')
      .send({
        message: {
          messageId: 'invalid-payload',
          data: Buffer.from('not-json').toString('base64')
        }
      })
      .expect(204);
  });
});
