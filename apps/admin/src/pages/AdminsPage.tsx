import { useState } from 'react';
import { adminApi } from '../api';
import { ErrorBanner, PageHeader, Panel } from '../components/Common';

type Role = 'owner' | 'support' | 'content' | 'none';

export function AdminsPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('support');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (
      !window.confirm(
        `Set ${email} to role “${role}”? This changes privileged access after their token refreshes.`
      )
    ) {
      return;
    }
    try {
      const result = await adminApi.setRole(email, role);
      setMessage(`${result.email} was updated. They must sign out and in to refresh claims.`);
      setEmail('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not change role.');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Least privilege"
        title="Admins"
        description="Only an owner can change roles. Every change is written to the audit log."
      />
      <ErrorBanner error={error} />
      {message ? <div className="success-banner">{message}</div> : null}
      <div className="two-column">
        <Panel title="Set an admin role">
          <div className="form-stack">
            <label>
              Existing Firebase user email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="person@example.com"
              />
            </label>
            <label>
              Role
              <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
                <option value="support">Support — conversations and promo assignment</option>
                <option value="content">Content — app configuration</option>
                <option value="owner">Owner — grants, imports, and roles</option>
                <option value="none">Remove admin access</option>
              </select>
            </label>
            <button disabled={!email.includes('@')} onClick={() => void save()}>
              Update role
            </button>
          </div>
        </Panel>
        <Panel title="Role boundaries">
          <dl className="role-list">
            <dt>Support</dt>
            <dd>Read and reply to support; assign an already imported Play code.</dd>
            <dt>Content</dt>
            <dd>Change bounded app configuration and announcements.</dd>
            <dt>Owner</dt>
            <dd>Manual entitlements, code imports, role changes, and every lower permission.</dd>
          </dl>
          <div className="callout warn">
            <strong>Bootstrap owner</strong>
            <p>
              The deployment allowlist can establish the first owner. Remove it after assigning
              a durable owner custom claim.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
