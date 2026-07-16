import 'dotenv/config';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { randomUUID } from 'node:crypto';
import { createApp } from './app.js';
import { commaList, readEnvironment } from './env.js';
import { FirebaseAuthService } from './firebaseAuth.js';
import { FirestoreStore } from './firestoreStore.js';
import { GooglePlayPurchaseVerifier } from './googlePlay.js';
import { GoogleOidcInternalAuthService } from './internalAuth.js';

const env = readEnvironment();
if (!getApps().length) {
  const emulatorMode = Boolean(
    process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST
  );
  initializeApp(
    emulatorMode
      ? { projectId: env.GOOGLE_CLOUD_PROJECT }
      : {
          credential: applicationDefault(),
          projectId: env.GOOGLE_CLOUD_PROJECT
        }
  );
}

const app = createApp(
  {
    store: new FirestoreStore(),
    auth: new FirebaseAuthService(),
    purchases: new GooglePlayPurchaseVerifier(env.GOOGLE_PLAY_PACKAGE_NAME),
    internalAuth: new GoogleOidcInternalAuthService(
      env.INTERNAL_OIDC_AUDIENCE,
      env.INTERNAL_SERVICE_ACCOUNT
    ),
    now: () => new Date(),
    id: (prefix) => `${prefix}_${randomUUID()}`,
    adminEmailAllowlist: commaList(env.ADMIN_EMAIL_ALLOWLIST),
    allowedOrigins: commaList(env.ALLOWED_ORIGINS)
  },
  {
    premiumProductId: env.SPARK_PREMIUM_PRODUCT_ID,
    packageName: env.GOOGLE_PLAY_PACKAGE_NAME,
    supportRetentionDays: env.SUPPORT_RETENTION_DAYS,
    auditRetentionDays: env.AUDIT_RETENTION_DAYS
  }
);

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`Spark control plane listening on ${env.PORT}`);
});
