import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { ErrorBanner, PageHeader, Panel } from '../components/Common';
import type { AdminUser } from '../types';

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState('');
  const [assignedCode, setAssignedCode] = useState('');
  const [search, setSearch] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(reset = true, searchValue = search) {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.users(
        reset ? undefined : nextCursor ?? undefined,
        searchValue.trim() || undefined
      );
      setUsers((current) => (reset ? result.items : [...current, ...result.items]));
      setNextCursor(result.nextCursor);
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function grant(premium: boolean) {
    if (!selected || reason.trim().length < 3) return;
    const confirmed = window.confirm(
      `${premium ? 'Grant' : 'Revoke'} premium for ${selected.email ?? selected.uid}?\n\nReason: ${reason.trim()}`
    );
    if (!confirmed) return;
    try {
      await adminApi.grant(selected.uid, premium, reason);
      setReason('');
      await load(true);
      setSelected((current) =>
        current
          ? {
              ...current,
              entitlement: { premium, source: premium ? 'admin' : 'none', expiresAt: null }
            }
          : null
      );
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : 'Grant failed.');
    }
  }

  async function assignPromo() {
    if (!selected) return;
    if (
      !window.confirm(
        `Assign the next available official Play code to ${selected.email ?? selected.uid}?`
      )
    ) {
      return;
    }
    try {
      const result = await adminApi.assignPromo(selected.uid);
      setAssignedCode(result.code);
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : 'No code assigned.');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Cloud-feature identities only"
        title="Users"
        description="There is no habit-data review screen because the server never receives habit data."
        action={<button onClick={() => void load(true)}>Refresh</button>}
      />
      <ErrorBanner error={error} />
      <Panel title="Find a cloud identity">
        <div className="search-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Exact Firebase UID or email"
            onKeyDown={(event) => {
              if (event.key === 'Enter') void load(true);
            }}
          />
          <button onClick={() => void load(true)}>Search</button>
          {search ? (
            <button
              className="secondary"
              onClick={() => {
                setSearch('');
                void load(true, '');
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </Panel>
      <div className="two-column">
        <Panel title={`Users (${users.length})`}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Identity</th>
                  <th>Last seen</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.uid}
                    className={selected?.uid === user.uid ? 'selected' : ''}
                    onClick={() => {
                      setSelected(user);
                      setAssignedCode('');
                    }}
                  >
                    <td>
                      <strong>{user.email ?? 'Anonymous user'}</strong>
                      <code>{user.uid}</code>
                    </td>
                    <td>{new Date(user.lastSeenAt).toLocaleString()}</td>
                    <td>
                      <span className={user.entitlement?.premium ? 'badge premium' : 'badge'}>
                        {user.entitlement?.premium ? user.entitlement.source : 'free'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {nextCursor ? (
            <button
              className="secondary load-more"
              disabled={loading}
              onClick={() => void load(false)}
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          ) : null}
        </Panel>
        <Panel title="Access actions">
          {selected ? (
            <div className="form-stack">
              <div className="identity-card">
                <strong>{selected.email ?? 'Anonymous identity'}</strong>
                <code>{selected.uid}</code>
                <span>
                  {selected.platform ?? 'unknown platform'} · {selected.appVersion ?? 'unknown version'}
                </span>
              </div>
              <label>
                Required audit reason
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Why is access changing?"
                  maxLength={300}
                />
              </label>
              <div className="button-row">
                <button disabled={reason.trim().length < 3} onClick={() => void grant(true)}>
                  Grant premium
                </button>
                <button
                  className="danger secondary"
                  disabled={reason.trim().length < 3}
                  onClick={() => void grant(false)}
                >
                  Revoke
                </button>
              </div>
              <hr />
              <button className="secondary" onClick={() => void assignPromo()}>
                Assign official Play promo code
              </button>
              {assignedCode ? (
                <div className="code-result">
                  <span>Send this code privately:</span>
                  <code>{assignedCode}</code>
                  <button
                    className="text-button"
                    onClick={() => void navigator.clipboard.writeText(assignedCode)}
                  >
                    Copy
                  </button>
                </div>
              ) : null}
              <p className="hint">
                Manual grants require owner role. Support staff can assign pre-imported official
                Google Play codes.
              </p>
            </div>
          ) : (
            <div className="empty">Select a user.</div>
          )}
        </Panel>
      </div>
    </>
  );
}
