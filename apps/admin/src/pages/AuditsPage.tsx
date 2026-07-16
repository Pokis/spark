import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { Empty, ErrorBanner, PageHeader, Panel } from '../components/Common';
import type { AuditRecord } from '../types';

export function AuditsPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [action, setAction] = useState('');
  const [actorId, setActorId] = useState('');
  const [target, setTarget] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(reset = true) {
    setLoading(true);
    setError(null);
    try {
      if ([action, actorId, target].filter((value) => value.trim()).length > 1) {
        throw new Error('Use one exact filter at a time to keep Firestore reads bounded.');
      }
      const result = await adminApi.audits(reset ? undefined : nextCursor ?? undefined, {
        action: action.trim() || undefined,
        actorId: actorId.trim() || undefined,
        target: target.trim() || undefined
      });
      setRecords((current) => (reset ? result.items : [...current, ...result.items]));
      setNextCursor(result.nextCursor);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load audit records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Owner-only accountability"
        title="Audit log"
        description="Review grants, role changes, configuration, support actions, and purchase lifecycle events."
        action={<button onClick={() => void load(true)}>Refresh</button>}
      />
      <ErrorBanner error={error} />
      <Panel title="Filters (use one at a time)">
        <div className="filter-grid">
          <label>
            Exact action
            <input value={action} onChange={(event) => setAction(event.target.value)} />
          </label>
          <label>
            Exact actor ID
            <input value={actorId} onChange={(event) => setActorId(event.target.value)} />
          </label>
          <label>
            Exact target
            <input value={target} onChange={(event) => setTarget(event.target.value)} />
          </label>
          <button onClick={() => void load(true)}>Apply filters</button>
        </div>
      </Panel>
      <Panel title={`Records (${records.length})`}>
        {records.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target / reason</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{new Date(record.at).toLocaleString()}</td>
                    <td><code>{record.action}</code></td>
                    <td><code>{record.actorId}</code></td>
                    <td>
                      <code>{record.target}</code>
                      {record.reason ? <span>{record.reason}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No audit records match these filters.</Empty>
        )}
        {nextCursor ? (
          <button className="secondary load-more" disabled={loading} onClick={() => void load(false)}>
            {loading ? 'Loading…' : 'Load more'}
          </button>
        ) : null}
      </Panel>
    </>
  );
}
