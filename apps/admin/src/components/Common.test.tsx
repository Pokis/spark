import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Empty, ErrorBanner, PageHeader, Panel } from './Common';

describe('PageHeader', () => {
  it('renders accessible page context', () => {
    render(
      <PageHeader
        eyebrow="Private"
        title="Support"
        description="Only deliberately sent messages appear."
      />
    );
    expect(screen.getByRole('heading', { name: 'Support' })).toBeInTheDocument();
    expect(screen.getByText('Only deliberately sent messages appear.')).toBeInTheDocument();
  });

  it('renders optional actions, panels, empty states, and errors without empty noise', () => {
    const { rerender } = render(
      <>
        <PageHeader
          eyebrow="Private"
          title="Users"
          description="Cloud users only."
          action={<button type="button">Refresh</button>}
        />
        <Panel title="Overview" className="wide">
          Panel body
        </Panel>
        <Empty>Nothing here</Empty>
        <ErrorBanner error="Could not load" />
      </>
    );
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('Nothing here')).toHaveClass('empty');
    expect(screen.getByText('Could not load')).toHaveClass('error-banner');

    rerender(
      <>
        <Panel>Untitled</Panel>
        <ErrorBanner error={null} />
      </>
    );
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByText('Could not load')).not.toBeInTheDocument();
  });
});
