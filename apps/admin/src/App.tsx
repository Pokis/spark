import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { apiConfigured } from './api';
import { Layout } from './components/Layout';
import { firebaseConfigured, signIn, watchUser } from './firebase';
import { AdminsPage } from './pages/AdminsPage';
import { AuditsPage } from './pages/AuditsPage';
import { ConfigPage } from './pages/ConfigPage';
import { OverviewPage } from './pages/OverviewPage';
import { PromosPage } from './pages/PromosPage';
import { SupportPage } from './pages/SupportPage';
import { UsersPage } from './pages/UsersPage';
import type { Page } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>('overview');
  const configured = firebaseConfigured() && apiConfigured();

  useEffect(
    () =>
      watchUser((next) => {
        setUser(next);
        setReady(true);
      }),
    []
  );

  if (!configured) {
    return (
      <div className="center-page">
        <div className="setup-card">
          <span className="brand-mark large">✦</span>
          <h1>Spark admin is safely offline.</h1>
          <p>
            Add Firebase web-app values and the Cloud Run URL to
            <code> apps/admin/.env.local</code>. The mobile app does not need this dashboard.
          </p>
          <pre>
{`VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_SPARK_API_URL=`}
          </pre>
        </div>
      </div>
    );
  }

  if (!ready) return <div className="center-page">Checking admin session…</div>;
  if (!user) {
    return (
      <div className="center-page">
        <div className="login-card">
          <span className="brand-mark large">✦</span>
          <h1>Spark admin</h1>
          <p>
            Sign in with an allowlisted Google account, an assigned admin role, or the
            deterministic local emulator account.
          </p>
          <button onClick={() => void signIn()}>Continue to Spark admin</button>
        </div>
      </div>
    );
  }

  return (
    <Layout page={page} onPage={setPage} user={user}>
      {page === 'overview' ? <OverviewPage /> : null}
      {page === 'support' ? <SupportPage /> : null}
      {page === 'users' ? <UsersPage /> : null}
      {page === 'config' ? <ConfigPage /> : null}
      {page === 'promos' ? <PromosPage /> : null}
      {page === 'audits' ? <AuditsPage /> : null}
      {page === 'admins' ? <AdminsPage /> : null}
    </Layout>
  );
}
