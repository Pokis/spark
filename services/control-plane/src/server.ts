import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { randomUUID } from 'node:crypto';
import { createApp } from './app.js';
import { commaList, readEnvironment } from './env.js';
import { FirebaseAuthService } from './firebaseAuth.js';
import { FirestoreStore } from './firestoreStore.js';
import { GooglePlayPurchaseVerifier } from './googlePlay.js';

const env = readEnvironment();
if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: env.GOOGLE_CLOUD_PROJECT
  });
}

const app = createApp(
  {
    store: new FirestoreStore(),
    auth: new FirebaseAuthService(),
    purchases: new GooglePlayPurchaseVerifier(env.GOOGLE_PLAY_PACKAGE_NAME),
    now: () => new Date(),
    id: (prefix) => `${prefix}_${randomUUID()}`,
    adminEmailAllowlist: commaList(env.ADMIN_EMAIL_ALLOWLIST),
    allowedOrigins: commaList(env.ALLOWED_ORIGINS)
  },
  { premiumProductId: env.SPARK_PREMIUM_PRODUCT_ID }
);

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`Spark control plane listening on ${env.PORT}`);
});
