import type { AppConfig, PageResult } from '@spark/cloud-contracts';
import {
  FieldPath,
  FieldValue,
  getFirestore,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot
} from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import type {
  AdminUserRecord,
  AuditRecord,
  EntitlementRecord,
  InternalEventRecord,
  PageRequest,
  PlayPurchaseRecord,
  PromoCodeRecord,
  Store,
  SupportMessageRecord,
  SupportThreadRecord
} from './types.js';

interface Cursor {
  value: string;
  id: string;
}

function dataWithId<T>(snapshot: QueryDocumentSnapshot<DocumentData>): T {
  return { id: snapshot.id, ...snapshot.data() } as T;
}

function encodeCursor(value: string, id: string): string {
  return Buffer.from(JSON.stringify({ value, id }), 'utf8').toString('base64url');
}

function decodeCursor(cursor?: string): Cursor | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8')
    ) as Partial<Cursor>;
    return parsed.value && parsed.id ? { value: parsed.value, id: parsed.id } : null;
  } catch {
    return null;
  }
}

function pageFromSnapshots<T>(
  snapshots: QueryDocumentSnapshot<DocumentData>[],
  limit: number,
  sortField: string
): PageResult<T> {
  const hasMore = snapshots.length > limit;
  const visible = snapshots.slice(0, limit);
  const last = visible.at(-1);
  return {
    items: visible.map((doc) => dataWithId<T>(doc)),
    nextCursor:
      hasMore && last
        ? encodeCursor(String(last.get(sortField)), last.id)
        : null
  };
}

function withCursor(
  query: Query,
  page: PageRequest
): Query {
  const cursor = decodeCursor(page.cursor);
  return cursor ? query.startAfter(cursor.value, cursor.id) : query;
}

export class FirestoreStore implements Store {
  private readonly db = getFirestore();

  async getConfig(): Promise<AppConfig | null> {
    const snapshot = await this.db.doc('config/current').get();
    return snapshot.exists ? (snapshot.data() as AppConfig) : null;
  }

  async setConfig(config: AppConfig): Promise<void> {
    await this.db.doc('config/current').set(config);
  }

  async touchUser(
    uid: string,
    data: { email?: string; platform?: string; appVersion?: string; at: string }
  ): Promise<void> {
    const ref = this.db.doc(`users/${uid}`);
    await this.db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      transaction.set(
        ref,
        {
          uid,
          ...data,
          ...(data.email ? { emailLower: data.email.toLowerCase() } : {}),
          ...(existing.exists ? {} : { createdAt: data.at }),
          lastSeenAt: data.at
        },
        { merge: true }
      );
    });
  }

  async createSupportThread(
    thread: SupportThreadRecord,
    message: SupportMessageRecord
  ): Promise<void> {
    const batch = this.db.batch();
    batch.set(this.db.doc(`supportThreads/${thread.id}`), thread);
    batch.set(this.db.doc(`supportThreads/${thread.id}/messages/${message.id}`), message);
    await batch.commit();
  }

  async listUserSupportThreads(uid: string, limit: number): Promise<SupportThreadRecord[]> {
    const snapshot = await this.db
      .collection('supportThreads')
      .where('ownerId', '==', uid)
      .orderBy('lastMessageAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => dataWithId<SupportThreadRecord>(doc));
  }

  async getSupportThread(id: string): Promise<SupportThreadRecord | null> {
    const snapshot = await this.db.doc(`supportThreads/${id}`).get();
    return snapshot.exists
      ? ({ id: snapshot.id, ...snapshot.data() } as SupportThreadRecord)
      : null;
  }

  async listSupportThreads(
    status: SupportThreadRecord['status'] | undefined,
    page: PageRequest
  ): Promise<PageResult<SupportThreadRecord>> {
    let query: Query = this.db.collection('supportThreads');
    if (status) query = query.where('status', '==', status);
    query = query
      .orderBy('lastMessageAt', 'desc')
      .orderBy(FieldPath.documentId(), 'desc');
    const snapshot = await withCursor(query, page).limit(page.limit + 1).get();
    return pageFromSnapshots<SupportThreadRecord>(
      snapshot.docs,
      page.limit,
      'lastMessageAt'
    );
  }

  async listSupportMessages(
    threadId: string,
    limit: number
  ): Promise<SupportMessageRecord[]> {
    const snapshot = await this.db
      .collection(`supportThreads/${threadId}/messages`)
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => dataWithId<SupportMessageRecord>(doc));
  }

  async listSupportMessagesPage(
    threadId: string,
    page: PageRequest
  ): Promise<PageResult<SupportMessageRecord>> {
    const query = this.db
      .collection(`supportThreads/${threadId}/messages`)
      .orderBy('createdAt', 'desc')
      .orderBy(FieldPath.documentId(), 'desc');
    const snapshot = await withCursor(query, page).limit(page.limit + 1).get();
    return pageFromSnapshots<SupportMessageRecord>(
      snapshot.docs,
      page.limit,
      'createdAt'
    );
  }

  async addSupportMessage(
    threadId: string,
    message: SupportMessageRecord,
    next: Partial<SupportThreadRecord>
  ): Promise<void> {
    const batch = this.db.batch();
    batch.set(this.db.doc(`supportThreads/${threadId}/messages/${message.id}`), message);
    batch.set(this.db.doc(`supportThreads/${threadId}`), next, { merge: true });
    await batch.commit();
  }

  async updateSupportThread(
    id: string,
    updates: Partial<SupportThreadRecord>
  ): Promise<void> {
    await this.db.doc(`supportThreads/${id}`).update(updates);
  }

  async getEntitlement(uid: string): Promise<EntitlementRecord | null> {
    const snapshot = await this.db.doc(`entitlements/${uid}`).get();
    return snapshot.exists ? (snapshot.data() as EntitlementRecord) : null;
  }

  async setEntitlement(uid: string, entitlement: EntitlementRecord): Promise<void> {
    const batch = this.db.batch();
    batch.set(this.db.doc(`entitlements/${uid}`), entitlement);
    batch.set(this.db.doc(`users/${uid}`), { uid, entitlement }, { merge: true });
    await batch.commit();
  }

  async claimPlayPurchase(input: {
    purchase: PlayPurchaseRecord;
    entitlement?: EntitlementRecord;
    allowTransfer: boolean;
  }): Promise<{
    status: 'claimed' | 'existing' | 'transferred' | 'conflict';
    previousOwnerId?: string;
  }> {
    const purchaseRef = this.db.doc(`playPurchases/${input.purchase.tokenHash}`);
    const orderRef = input.purchase.orderIdHash
      ? this.db.doc(`playOrders/${input.purchase.orderIdHash}`)
      : null;
    return this.db.runTransaction(async (transaction) => {
      const [existingPurchase, existingOrder] = await Promise.all([
        transaction.get(purchaseRef),
        orderRef ? transaction.get(orderRef) : Promise.resolve(null)
      ]);
      const current = existingPurchase.exists
        ? (existingPurchase.data() as PlayPurchaseRecord)
        : null;
      const orderData = existingOrder?.exists
        ? (existingOrder.data() as {
            tokenHash: string;
            ownerId: string;
          })
        : null;

      if (
        orderData &&
        (orderData.tokenHash !== input.purchase.tokenHash ||
          (orderData.ownerId !== input.purchase.ownerId && !input.allowTransfer))
      ) {
        return { status: 'conflict' as const };
      }
      if (
        current &&
        current.ownerId !== input.purchase.ownerId &&
        !input.allowTransfer
      ) {
        return {
          status: 'conflict' as const,
          previousOwnerId: current.ownerId
        };
      }

      const previousOwnerId =
        current && current.ownerId !== input.purchase.ownerId
          ? current.ownerId
          : orderData && orderData.ownerId !== input.purchase.ownerId
            ? orderData.ownerId
            : undefined;
      if (previousOwnerId) {
        const previousEntitlementRef = this.db.doc(
          `entitlements/${previousOwnerId}`
        );
        const previousEntitlement = await transaction.get(previousEntitlementRef);
        if (
          previousEntitlement.exists &&
          (previousEntitlement.data() as EntitlementRecord).source === 'play'
        ) {
          const revoked: EntitlementRecord = {
            ...(previousEntitlement.data() as EntitlementRecord),
            premium: false,
            updatedAt: input.purchase.updatedAt
          };
          transaction.set(previousEntitlementRef, revoked);
          transaction.set(
            this.db.doc(`users/${previousOwnerId}`),
            { entitlement: revoked },
            { merge: true }
          );
        }
      }

      transaction.set(purchaseRef, input.purchase);
      if (orderRef) {
        transaction.set(orderRef, {
          tokenHash: input.purchase.tokenHash,
          ownerId: input.purchase.ownerId,
          updatedAt: input.purchase.updatedAt
        });
      }
      if (input.entitlement) {
        transaction.set(
          this.db.doc(`entitlements/${input.purchase.ownerId}`),
          input.entitlement
        );
        transaction.set(
          this.db.doc(`users/${input.purchase.ownerId}`),
          {
            uid: input.purchase.ownerId,
            entitlement: input.entitlement,
            lastSeenAt: input.purchase.updatedAt
          },
          { merge: true }
        );
      }

      return previousOwnerId
        ? { status: 'transferred' as const, previousOwnerId }
        : current
          ? { status: 'existing' as const }
          : { status: 'claimed' as const };
    });
  }

  async revokePlayPurchase(input: {
    tokenHash: string;
    orderIdHash?: string;
    reason: string;
    at: string;
  }): Promise<{ ownerId?: string; changed: boolean }> {
    let purchaseRef = this.db.doc(`playPurchases/${input.tokenHash}`);
    let purchaseSnapshot = await purchaseRef.get();
    if (!purchaseSnapshot.exists && input.orderIdHash) {
      const orderSnapshot = await this.db.doc(`playOrders/${input.orderIdHash}`).get();
      const order = orderSnapshot.data() as { tokenHash?: string } | undefined;
      if (order?.tokenHash) {
        purchaseRef = this.db.doc(`playPurchases/${order.tokenHash}`);
        purchaseSnapshot = await purchaseRef.get();
      }
    }
    if (!purchaseSnapshot.exists) return { changed: false };

    return this.db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(purchaseRef);
      if (!fresh.exists) return { changed: false };
      const purchase = fresh.data() as PlayPurchaseRecord;
      const entitlementRef = this.db.doc(`entitlements/${purchase.ownerId}`);
      const entitlementSnapshot = await transaction.get(entitlementRef);
      const alreadyRevoked = purchase.state !== 'active';
      transaction.set(
        purchaseRef,
        {
          ...purchase,
          state: input.reason === 'canceled' ? 'canceled' : 'revoked',
          revokeReason: input.reason,
          updatedAt: input.at
        } satisfies PlayPurchaseRecord
      );
      if (
        entitlementSnapshot.exists &&
        (entitlementSnapshot.data() as EntitlementRecord).source === 'play'
      ) {
        const revoked: EntitlementRecord = {
          ...(entitlementSnapshot.data() as EntitlementRecord),
          premium: false,
          updatedAt: input.at
        };
        transaction.set(entitlementRef, revoked);
        transaction.set(
          this.db.doc(`users/${purchase.ownerId}`),
          { entitlement: revoked },
          { merge: true }
        );
      }
      return { ownerId: purchase.ownerId, changed: !alreadyRevoked };
    });
  }

  async reconcilePlayPurchase(input: {
    tokenHash: string;
    orderIdHash?: string;
    productId: string;
    state: 'purchased' | 'pending' | 'canceled';
    at: string;
  }): Promise<{ ownerId?: string; changed: boolean }> {
    if (input.state === 'canceled') {
      return this.revokePlayPurchase({
        tokenHash: input.tokenHash,
        orderIdHash: input.orderIdHash,
        reason: 'canceled',
        at: input.at
      });
    }
    const ref = this.db.doc(`playPurchases/${input.tokenHash}`);
    return this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return { changed: false };
      const purchase = snapshot.data() as PlayPurchaseRecord;
      if (purchase.productId !== input.productId) return { changed: false };
      const nextState = input.state === 'purchased' ? 'active' : 'pending';
      const changed = purchase.state !== nextState;
      transaction.set(
        ref,
        {
          ...purchase,
          state: nextState,
          orderIdHash: input.orderIdHash ?? purchase.orderIdHash,
          updatedAt: input.at
        } satisfies PlayPurchaseRecord
      );
      if (input.state === 'purchased') {
        const entitlement: EntitlementRecord = {
          premium: true,
          source: 'play',
          productId: input.productId,
          expiresAt: null,
          updatedAt: input.at
        };
        transaction.set(this.db.doc(`entitlements/${purchase.ownerId}`), entitlement);
        transaction.set(
          this.db.doc(`users/${purchase.ownerId}`),
          { uid: purchase.ownerId, entitlement, lastSeenAt: input.at },
          { merge: true }
        );
      }
      return { ownerId: purchase.ownerId, changed };
    });
  }

  async listUsers(
    page: PageRequest & { search?: string }
  ): Promise<PageResult<AdminUserRecord>> {
    const search = page.search?.trim();
    if (search) {
      const direct = await this.db.doc(`users/${search}`).get();
      if (direct.exists) {
        return {
          items: [{ id: direct.id, ...direct.data() } as unknown as AdminUserRecord],
          nextCursor: null
        };
      }
      const byEmail = await this.db
        .collection('users')
        .where('emailLower', '==', search.toLowerCase())
        .limit(page.limit)
        .get();
      return {
        items: byEmail.docs.map((doc) => dataWithId<AdminUserRecord>(doc)),
        nextCursor: null
      };
    }
    const query = this.db
      .collection('users')
      .orderBy('lastSeenAt', 'desc')
      .orderBy(FieldPath.documentId(), 'desc');
    const snapshot = await withCursor(query, page).limit(page.limit + 1).get();
    return pageFromSnapshots<AdminUserRecord>(snapshot.docs, page.limit, 'lastSeenAt');
  }

  async overview(): Promise<{ users: number; openSupport: number; premium: number }> {
    const [users, openSupport, premium] = await Promise.all([
      this.db.collection('users').count().get(),
      this.db.collection('supportThreads').where('status', '!=', 'resolved').count().get(),
      this.db.collection('entitlements').where('premium', '==', true).count().get()
    ]);
    return {
      users: users.data().count,
      openSupport: openSupport.data().count,
      premium: premium.data().count
    };
  }

  async importPromoCodes(codes: PromoCodeRecord[]): Promise<number> {
    let imported = 0;
    for (let index = 0; index < codes.length; index += 400) {
      const chunk = codes.slice(index, index + 400);
      const refs = chunk.map((code) => this.db.doc(`promoCodes/${code.id}`));
      const existing = await this.db.getAll(...refs);
      const batch = this.db.batch();
      let chunkImported = 0;
      for (let offset = 0; offset < chunk.length; offset += 1) {
        if (existing[offset]?.exists) continue;
        batch.create(refs[offset]!, chunk[offset]!);
        imported += 1;
        chunkImported += 1;
      }
      if (chunkImported > 0) await batch.commit();
    }
    return imported;
  }

  async assignPromoCode(uid: string, now: string): Promise<PromoCodeRecord | null> {
    const available = await this.db
      .collection('promoCodes')
      .where('status', '==', 'available')
      .limit(1)
      .get();
    const first = available.docs[0];
    if (!first) return null;
    return this.db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(first.ref);
      const data = fresh.data() as PromoCodeRecord | undefined;
      if (!data || data.status !== 'available') return null;
      const assigned = {
        ...data,
        id: first.id,
        status: 'assigned' as const,
        assignedAt: now,
        assignedTo: uid
      };
      transaction.set(first.ref, assigned);
      return assigned;
    });
  }

  async listPromoCodes(page: PageRequest): Promise<PageResult<PromoCodeRecord>> {
    const query = this.db
      .collection('promoCodes')
      .orderBy('importedAt', 'desc')
      .orderBy(FieldPath.documentId(), 'desc');
    const snapshot = await withCursor(query, page).limit(page.limit + 1).get();
    return pageFromSnapshots<PromoCodeRecord>(snapshot.docs, page.limit, 'importedAt');
  }

  async listAudits(
    page: PageRequest & {
      action?: string;
      actorId?: string;
      target?: string;
    }
  ): Promise<PageResult<AuditRecord>> {
    let query: Query = this.db.collection('adminAudit');
    if (page.action) query = query.where('action', '==', page.action);
    if (page.actorId) query = query.where('actorId', '==', page.actorId);
    if (page.target) query = query.where('target', '==', page.target);
    query = query
      .orderBy('at', 'desc')
      .orderBy(FieldPath.documentId(), 'desc');
    const snapshot = await withCursor(query, page).limit(page.limit + 1).get();
    return pageFromSnapshots<AuditRecord>(snapshot.docs, page.limit, 'at');
  }

  async writeAudit(record: AuditRecord): Promise<void> {
    await this.db.doc(`adminAudit/${record.id}`).set({
      ...record,
      serverWrittenAt: FieldValue.serverTimestamp()
    });
  }

  async claimInternalEvent(record: InternalEventRecord): Promise<boolean> {
    const ref = this.db.doc(`internalEvents/${record.id}`);
    return this.db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) return false;
      transaction.create(ref, record);
      return true;
    });
  }

  async releaseInternalEvent(id: string): Promise<void> {
    await this.db.doc(`internalEvents/${id}`).delete();
  }

  async purgeExpired(
    now: string,
    limit: number
  ): Promise<{ supportThreads: number; audits: number; internalEvents: number }> {
    const [threads, audits, events] = await Promise.all([
      this.db
        .collection('supportThreads')
        .where('deleteAfter', '<=', now)
        .limit(limit)
        .get(),
      this.db.collection('adminAudit').where('deleteAfter', '<=', now).limit(limit).get(),
      this.db
        .collection('internalEvents')
        .where('deleteAfter', '<=', now)
        .limit(limit)
        .get()
    ]);
    for (const thread of threads.docs) await this.db.recursiveDelete(thread.ref);
    for (const docs of [audits.docs, events.docs]) {
      for (let index = 0; index < docs.length; index += 400) {
        const batch = this.db.batch();
        for (const doc of docs.slice(index, index + 400)) batch.delete(doc.ref);
        await batch.commit();
      }
    }
    return {
      supportThreads: threads.size,
      audits: audits.size,
      internalEvents: events.size
    };
  }

  async healthCheck(): Promise<void> {
    await this.db.doc('config/current').get();
  }

  async deleteUserData(uid: string): Promise<void> {
    const deletedOwner = `deleted_${randomUUID()}`;
    const [
      threads,
      purchases,
      targetAudits,
      actorAudits,
      previousOwnerAudits,
      authoredMessages,
      promoAssignments
    ] = await Promise.all([
      this.db.collection('supportThreads').where('ownerId', '==', uid).get(),
      this.db.collection('playPurchases').where('ownerId', '==', uid).get(),
      this.db.collection('adminAudit').where('target', '==', uid).get(),
      this.db.collection('adminAudit').where('actorId', '==', uid).get(),
      this.db
        .collection('adminAudit')
        .where('metadata.previousOwnerId', '==', uid)
        .get(),
      this.db.collectionGroup('messages').where('authorId', '==', uid).get(),
      this.db.collection('promoCodes').where('assignedTo', '==', uid).get()
    ]);
    for (const thread of threads.docs) await this.db.recursiveDelete(thread.ref);
    for (const purchase of purchases.docs) {
      const data = purchase.data() as PlayPurchaseRecord;
      const batch = this.db.batch();
      batch.set(
        purchase.ref,
        { ownerId: deletedOwner, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      if (data.orderIdHash) {
        batch.set(
          this.db.doc(`playOrders/${data.orderIdHash}`),
          { ownerId: deletedOwner },
          { merge: true }
        );
      }
      await batch.commit();
    }

    const auditDocuments = new Map(
      [...targetAudits.docs, ...actorAudits.docs, ...previousOwnerAudits.docs].map(
        (document) => [document.ref.path, document]
      )
    );
    const relatedDocuments = [
      ...auditDocuments.values(),
      ...authoredMessages.docs,
      ...promoAssignments.docs
    ];
    for (let index = 0; index < relatedDocuments.length; index += 400) {
      const privacyBatch = this.db.batch();
      for (const document of relatedDocuments.slice(index, index + 400)) {
        const data = document.data() as Record<string, unknown>;
        const updates: Record<string, unknown> = {};
        if (data.actorId === uid) updates.actorId = deletedOwner;
        if (data.target === uid) updates.target = deletedOwner;
        if (data.authorId === uid) updates.authorId = deletedOwner;
        if (data.assignedTo === uid) updates.assignedTo = deletedOwner;
        const metadata = data.metadata;
        if (
          metadata &&
          typeof metadata === 'object' &&
          !Array.isArray(metadata) &&
          (metadata as Record<string, unknown>).previousOwnerId === uid
        ) {
          const {
            previousOwnerId: _previousOwnerId,
            ...remainingMetadata
          } = metadata as Record<string, unknown>;
          updates.metadata = {
            ...remainingMetadata,
            transferredFromDeletedIdentity: true
          };
        }
        if (Object.keys(updates).length > 0) {
          privacyBatch.set(document.ref, updates, { merge: true });
        }
      }
      await privacyBatch.commit();
    }

    const batch = this.db.batch();
    batch.delete(this.db.doc(`entitlements/${uid}`));
    batch.delete(this.db.doc(`users/${uid}`));
    await batch.commit();
  }
}
