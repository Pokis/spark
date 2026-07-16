import type { PropsWithChildren, ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

export function Panel({
  title,
  children,
  className = ''
}: PropsWithChildren<{ title?: string; className?: string }>) {
  return (
    <section className={`panel ${className}`}>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
}

export function Empty({ children }: PropsWithChildren) {
  return <div className="empty">{children}</div>;
}

export function ErrorBanner({ error }: { error: string | null }) {
  return error ? <div className="error-banner">{error}</div> : null;
}
