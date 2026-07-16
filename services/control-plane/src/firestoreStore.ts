import type { AppConfig } from '@spark/cloud-contracts';
import {
  FieldValue,
  getFirestore,
  type DocumentData,
  type QueryDocumentSnapshot
} from 'firebase-admin/firestore';
import type {
  AdminUserRecord,
  AuditRecord,
  EntitlementRecord,
  PromoCodeRecord,
  Store,
  SupportMessageRecord,
  SupportThreadRecord
} from './types.js';

function dataWithId<T>(
  snapshot: QueryDocumentSnapshot<DocumentData>
): T {
  return { id: snapshot.id, ...snapshot.data() } as T;
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
    limit: number
  ): Promise<SupportThreadRecord[]> {
    let query: FirebaseFirestore.Query = this.db.collection('supportThreads');
    if (status) query = query.where('status', '==', status);
    const snapshot = await query.orderBy('lastMessageAt', 'desc').limit(limit).get();
    return snapshot.docs.map((doc) => dataWithId<SupportThreadRecord>(doc));
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
    await this.db.doc(`supportThreads/${id}`).set(updates, { merge: true });
  }

  async getEntitlement(uid: string): Promise<EntitlementRecord | null> {
    const snapshot = await this.db.doc(`entitlements/${uid}`).get();
    return snapshot.exists ? (snapshot.data() as EntitlementRecord) : null;
  }

  async setEntitlement(uid: string, entitlement: EntitlementRecord): Promise<void> {
    const batch = this.db.batch();
    batch.set(this.db.doc(`entitlements/${uid}`), entitlement);
    batch.set(this.db.doc(`users/${uid}`), { entitlement }, { merge: true });
    await batch.commit();
  }

  async listUsers(limit: number): Promise<AdminUserRecord[]> {
    const snapshot = await this.db
      .collection('users')
      .orderBy('lastSeenAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => dataWithId<AdminUserRecord>(doc));
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

  async listPromoCodes(limit: number): Promise<PromoCodeRecord[]> {
    const snapshot = await this.db
      .collection('promoCodes')
      .orderBy('importedAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => dataWithId<PromoCodeRecord>(doc));
  }

  async writeAudit(record: AuditRecord): Promise<void> {
    await this.db.doc(`adminAudit/${record.id}`).set({
      ...record,
      serverWrittenAt: FieldValue.serverTimestamp()
    });
  }

  async deleteUserData(uid: string): Promise<void> {
    const threads = await this.db
      .collection('supportThreads')
      .where('ownerId', '==', uid)
      .get();
    for (const thread of threads.docs) {
      await this.db.recursiveDelete(thread.ref);
    }
    const batch = this.db.batch();
    batch.delete(this.db.doc(`entitlements/${uid}`));
    batch.delete(this.db.doc(`users/${uid}`));
    await batch.commit();
  }
}
