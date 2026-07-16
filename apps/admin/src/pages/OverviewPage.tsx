import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { ErrorBanner, PageHeader, Panel } from '../components/Common';
import type { Overview } from '../types';

export function OverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setOverview(await adminApi.overview());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load overview.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <PageHeader
        eyebrow="Cost-aware control plane"
        title="Overview"
        description="Only users who deliberately use a cloud feature appear here. Local habit data is never visible."
        action={<button onClick={() => void load()}>Refresh</button>}
      />
      <ErrorBanner error={error} />
      <div className="metric-grid">
        <Panel>
          <span className="metric">{overview?.users ?? '—'}</span>
          <span className="metric-label">cloud identities</span>
        </Panel>
        <Panel>
          <span className="metric">{overview?.openSupport ?? '—'}</span>
          <span className="metric-label">open conversations</span>
        </Panel>
        <Panel>
          <span className="metric">{overview?.premium ?? '—'}</span>
          <span className="metric-label">premium grants</span>
        </Panel>
      </div>
      <Panel title="Privacy boundary">
        <div className="callout good">
          <strong>Intentionally unavailable</strong>
          <p>
            Habit names, completions, focus titles, routines, capacity check-ins, brain dumps,
            device backups, and notification schedules.
          </p>
        </div>
      </Panel>
      <Panel title="Cost posture">
        <ul className="clean-list">
          <li>Cloud Run scales to zero and is capped at two instances.</li>
          <li>The dashboard uses explicit refreshes—no always-on Firestore listeners.</li>
          <li>Every list is bounded; support messages are rate-limited.</li>
          <li>Budgets alert you but cannot stop billing, so quota limits are separate.</li>
        </ul>
      </Panel>
    </>
  );
}
