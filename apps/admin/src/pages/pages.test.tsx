import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { defaultAppConfig } from '@spark/cloud-contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminsPage } from './AdminsPage';
import { AuditsPage } from './AuditsPage';
import { ConfigPage } from './ConfigPage';
import { PromosPage } from './PromosPage';
import { SupportPage } from './SupportPage';
import { UsersPage } from './UsersPage';

const api = vi.hoisted(() => ({
  config: vi.fn(),
  saveConfig: vi.fn(),
  users: vi.fn(),
  grant: vi.fn(),
  assignPromo: vi.fn(),
  support: vi.fn(),
  messages: vi.fn(),
  reply: vi.fn(),
  supportStatus: vi.fn(),
  promos: vi.fn(),
  importPromos: vi.fn(),
  audits: vi.fn(),
  setRole: vi.fn()
}));

vi.mock('../api', () => ({ adminApi: api }));

describe('admin operation pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.config.mockResolvedValue(defaultAppConfig);
    api.saveConfig.mockResolvedValue({
      ...defaultAppConfig,
      updatedAt: '2026-07-16T12:00:00.000Z'
    });
    api.users.mockResolvedValue({ items: [], nextCursor: null });
    api.support.mockResolvedValue({ items: [], nextCursor: null });
    api.messages.mockResolvedValue({ items: [], nextCursor: null });
    api.promos.mockResolvedValue({ items: [], nextCursor: null });
    api.audits.mockResolvedValue({ items: [], nextCursor: null });
  });

  it('loads, edits, confirms, and saves bounded global configuration', async () => {
    render(<ConfigPage />);
    expect(
      await screen.findByText(/switches are all off in baked defaults/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Global announcements/i));
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Small update' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save config' }));

    await waitFor(() => expect(api.saveConfig).toHaveBeenCalledTimes(1));
    expect(api.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        defaults: expect.objectContaining({ announcementsEnabled: true }),
        announcements: [
          expect.objectContaining({ title: 'Small update' })
        ]
      })
    );
    expect(screen.getByText(/Saved/)).toBeInTheDocument();
  });

  it('searches cloud identities and requires an audited premium grant', async () => {
    const user = {
      uid: 'user-1',
      email: 'person@example.com',
      createdAt: '2026-07-01T00:00:00.000Z',
      lastSeenAt: '2026-07-16T10:00:00.000Z',
      platform: 'android',
      appVersion: '1.0.0',
      entitlement: { premium: false, source: 'none', expiresAt: null }
    };
    api.users.mockResolvedValue({ items: [user], nextCursor: null });
    api.grant.mockResolvedValue(undefined);
    api.assignPromo.mockResolvedValue({
      code: 'SPARK-PLAY-CODE',
      productId: 'spark_premium_lifetime'
    });

    render(<UsersPage />);
    fireEvent.click(await screen.findByText('person@example.com'));
    fireEvent.change(screen.getByPlaceholderText('Why is access changing?'), {
      target: { value: 'Founder grant' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Grant premium' }));

    await waitFor(() =>
      expect(api.grant).toHaveBeenCalledWith(
        'user-1',
        true,
        'Founder grant'
      )
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Assign official Play promo code'
      })
    );
    expect(await screen.findByText('SPARK-PLAY-CODE')).toBeInTheDocument();
  });

  it('opens, replies to, and resolves a private support conversation', async () => {
    const thread = {
      id: 'thread-1',
      ownerId: 'user-1',
      subject: 'Need help',
      status: 'open' as const,
      createdAt: '2026-07-16T09:00:00.000Z',
      lastMessageAt: '2026-07-16T10:00:00.000Z',
      unreadByAdmin: 1,
      appVersion: '1.0.0',
      platform: 'android'
    };
    api.support.mockResolvedValue({ items: [thread], nextCursor: null });
    api.messages.mockResolvedValue({
      items: [
        {
          id: 'message-1',
          author: 'user',
          text: 'How do I restore?',
          createdAt: '2026-07-16T10:00:00.000Z'
        }
      ],
      nextCursor: null
    });
    api.reply.mockResolvedValue(undefined);
    api.supportStatus.mockResolvedValue(undefined);

    render(<SupportPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Need help/ }));
    expect(await screen.findByText('How do I restore?')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Reply'), {
      target: { value: 'Open Settings, then Backups.' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    await waitFor(() =>
      expect(api.reply).toHaveBeenCalledWith(
        'thread-1',
        'Open Settings, then Backups.'
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    await waitFor(() =>
      expect(api.supportStatus).toHaveBeenCalledWith('thread-1', 'resolved')
    );
  });

  it('imports only explicitly confirmed official Play promo codes', async () => {
    api.promos.mockResolvedValue({
      items: [
        {
          id: 'promo-1',
          code: 'EXISTING',
          campaign: 'Launch',
          productId: 'spark_premium_lifetime',
          status: 'available',
          importedAt: '2026-07-16T10:00:00.000Z'
        }
      ],
      nextCursor: null
    });
    api.importPromos.mockResolvedValue({ imported: 2 });

    render(<PromosPage />);
    expect(await screen.findByText('EXISTING')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Campaign name'), {
      target: { value: 'Friends' }
    });
    fireEvent.change(screen.getByLabelText('Codes, one per line'), {
      target: { value: 'ONE\nTWO' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import codes' }));

    await waitFor(() =>
      expect(api.importPromos).toHaveBeenCalledWith({
        codes: ['ONE', 'TWO'],
        campaign: 'Friends',
        productId: 'spark_premium_lifetime'
      })
    );
    expect(screen.getByText('Imported 2 code(s).')).toBeInTheDocument();
  });

  it('keeps audit searches bounded to one exact filter', async () => {
    render(<AuditsPage />);
    await waitFor(() => expect(api.audits).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('Exact action'), {
      target: { value: 'entitlement.grant' }
    });
    fireEvent.change(screen.getByLabelText('Exact actor ID'), {
      target: { value: 'owner-1' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    expect(
      await screen.findByText(
        'Use one exact filter at a time to keep Firestore reads bounded.'
      )
    ).toBeInTheDocument();
    expect(api.audits).toHaveBeenCalledTimes(1);
  });

  it('confirms least-privilege admin role changes', async () => {
    api.setRole.mockResolvedValue({
      uid: 'support-1',
      email: 'support@example.com'
    });
    render(<AdminsPage />);
    fireEvent.change(screen.getByLabelText('Existing Firebase user email'), {
      target: { value: 'support@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Role'), {
      target: { value: 'content' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update role' }));

    await waitFor(() =>
      expect(api.setRole).toHaveBeenCalledWith(
        'support@example.com',
        'content'
      )
    );
    expect(
      screen.getByText(/support@example.com was updated/)
    ).toBeInTheDocument();
  });
});
