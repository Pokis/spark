const projectId = process.env.SPARK_EMULATOR_PROJECT ?? 'demo-spark-local';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';

if (
  !projectId.startsWith('demo-') ||
  !/^(127\.0\.0\.1|localhost):\d+$/.test(firestoreHost) ||
  !/^(127\.0\.0\.1|localhost):\d+$/.test(authHost)
) {
  throw new Error(
    'Refusing to seed: Spark emulator seeding only accepts a demo-* project on localhost.'
  );
}

process.env.GOOGLE_CLOUD_PROJECT = projectId;
process.env.GCLOUD_PROJECT = projectId;
process.env.FIRESTORE_EMULATOR_HOST = firestoreHost;
process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost;

const [{ initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
  import('firebase-admin/app'),
  import('firebase-admin/auth'),
  import('firebase-admin/firestore')
]);

const app = initializeApp({ projectId }, `spark-emulator-seed-${Date.now()}`);
const auth = getAuth(app);
const db = getFirestore(app);
const owner = {
  uid: 'spark-local-owner',
  email: 'owner@spark.local',
  password: 'SparkLocalOnly123!'
};

try {
  await auth.getUser(owner.uid);
  await auth.updateUser(owner.uid, {
    email: owner.email,
    password: owner.password,
    emailVerified: true,
    displayName: 'Spark Local Owner'
  });
} catch (error) {
  if (error?.code !== 'auth/user-not-found') throw error;
  await auth.createUser({
    ...owner,
    emailVerified: true,
    displayName: 'Spark Local Owner'
  });
}
await auth.setCustomUserClaims(owner.uid, { adminRole: 'owner' });

const now = new Date('2026-07-16T12:00:00.000Z').toISOString();
const deleteAfter = new Date('2030-07-16T12:00:00.000Z').toISOString();
const batch = db.batch();
batch.set(db.doc('config/current'), {
  schemaVersion: 1,
  updatedAt: now,
  announcements: [
    {
      id: 'local-welcome',
      title: 'Local cloud is connected',
      body: 'This announcement came from the Firestore emulator.',
      enabled: true
    }
  ],
  features: {
    supportInbox: true,
    premiumPurchase: false,
    cloudConfig: true
  },
  defaults: {
    maxDailyHabitNotifications: 4,
    focusMinutes: [5, 10, 25, 50],
    supportEnabled: true,
    purchasesEnabled: false
  }
});
batch.set(db.doc(`users/${owner.uid}`), {
  uid: owner.uid,
  email: owner.email,
  emailLower: owner.email,
  platform: 'android',
  appVersion: 'local',
  createdAt: now,
  lastSeenAt: now
});
batch.set(db.doc('supportThreads/local-welcome'), {
  id: 'local-welcome',
  ownerId: owner.uid,
  subject: 'A seeded support conversation',
  status: 'open',
  createdAt: now,
  lastMessageAt: now,
  unreadByUser: 0,
  unreadByAdmin: 1,
  appVersion: 'local',
  platform: 'android',
  deleteAfter
});
batch.set(db.doc('supportThreads/local-welcome/messages/local-message'), {
  id: 'local-message',
  author: 'user',
  authorId: owner.uid,
  text: 'This deterministic message proves the local inbox is working.',
  createdAt: now
});
batch.set(db.doc('promoCodes/local-demo-code'), {
  id: 'local-demo-code',
  code: 'SPARK-LOCAL-DEMO',
  campaign: 'local-development',
  productId: 'spark_premium_lifetime',
  status: 'available',
  importedAt: now
});
batch.set(db.doc('audits/local-seed'), {
  id: 'local-seed',
  actorId: 'emulator-seed',
  action: 'emulator.seeded',
  target: projectId,
  at: now,
  deleteAfter
});
await batch.commit();

console.log('Spark emulators seeded.');
console.log(`Admin sign-in: ${owner.email} / ${owner.password}`);
