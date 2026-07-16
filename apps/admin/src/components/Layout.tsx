import type { PropsWithChildren } from 'react';
import type { User } from 'firebase/auth';
import type { Page } from '../types';
import { logOut } from '../firebase';

const pages: { id: Page; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '✦' },
  { id: 'support', label: 'Support', icon: '☏' },
  { id: 'users', label: 'Users', icon: '◎' },
  { id: 'config', label: 'App config', icon: '⚙' },
  { id: 'promos', label: 'Promo codes', icon: '◇' },
  { id: 'audits', label: 'Audit log', icon: '≣' },
  { id: 'admins', label: 'Admins', icon: '♢' }
];

export function Layout({
  page,
  onPage,
  user,
  children
}: PropsWithChildren<{ page: Page; onPage(page: Page): void; user: User }>) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">✦</span>
          <div>
            <strong>Spark</strong>
            <small>minimal admin</small>
          </div>
        </div>
        <nav aria-label="Admin sections">
          {pages.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? 'nav-item active' : 'nav-item'}
              onClick={() => onPage(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="account">
          <small>Signed in as</small>
          <span title={user.email ?? ''}>{user.email}</span>
          <button className="text-button" onClick={() => void logOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <main>{children}</main>
    </div>
  );
}
