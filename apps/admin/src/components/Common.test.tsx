import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './Common';

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
});
