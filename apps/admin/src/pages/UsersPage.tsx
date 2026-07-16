import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { ErrorBanner, PageHeader, Panel } from '../components/Common';
import type { AdminUser } from '../types';

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState('');
  const [assignedCode, setAssignedCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setUsers(await adminApi.users());
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : 'Could not load users.');
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function grant(premium: boolean) {
    if (!selected || reason.trim().length < 3) return;
    try {
      await adminApi.grant(selected.uid, premium, reason);
      setReason('');
      await load();
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
        action={<button onClick={() => void load()}>Refresh</button>}
      />
      <ErrorBanner error={error} />
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
