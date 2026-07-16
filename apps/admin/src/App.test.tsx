import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { defaultAppConfig } from '@spark/cloud-contracts';
import type { User } from 'firebase/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const mocks = vi.hoisted(() => ({
  apiConfigured: vi.fn(),
  firebaseConfigured: vi.fn(),
  signIn: vi.fn(),
  logOut: vi.fn(),
  watchUser: vi.fn(),
  config: vi.fn(),
  overview: vi.fn()
}));

vi.mock('./firebase', () => ({
  firebaseConfigured: mocks.firebaseConfigured,
  signIn: mocks.signIn,
  logOut: mocks.logOut,
  watchUser: mocks.watchUser
}));

vi.mock('./api', () => ({
  apiConfigured: mocks.apiConfigured,
  adminApi: {
    config: mocks.config,
    saveConfig: vi.fn(),
    overview: mocks.overview,
    support: vi.fn(),
    messages: vi.fn(),
    reply: vi.fn(),
    supportStatus: vi.fn(),
    users: vi.fn(),
    grant: vi.fn(),
    assignPromo: vi.fn(),
    promos: vi.fn(),
    importPromos: vi.fn(),
    audits: vi.fn(),
    admins: vi.fn(),
    saveAdmin: vi.fn(),
    removeAdmin: vi.fn()
  }
}));

describe('admin application shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiConfigured.mockReturnValue(true);
    mocks.firebaseConfigured.mockReturnValue(true);
    mocks.watchUser.mockReturnValue(() => undefined);
    mocks.config.mockResolvedValue(defaultAppConfig);
    mocks.overview.mockResolvedValue({
      users: 3,
      openSupport: 1,
      premium: 2
    });
  });

  it('explains safe offline setup when cloud configuration is absent', () => {
    mocks.apiConfigured.mockReturnValue(false);
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Spark admin is safely offline.' })
    ).toBeInTheDocument();
    expect(screen.getByText(/VITE_SPARK_ADMIN_ENABLED=true/)).toBeInTheDocument();
  });

  it('shows session loading and then offers explicit sign in', async () => {
    let listener: ((user: User | null) => void) | undefined;
    mocks.watchUser.mockImplementation((callback) => {
      listener = callback;
      return () => undefined;
    });
    render(<App />);
    expect(screen.getByText('Checking admin session…')).toBeInTheDocument();

    await act(async () => listener?.(null));
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue to Spark admin' })
    );
    expect(mocks.signIn).toHaveBeenCalledTimes(1);
  });

  it('opens cost controls first and navigates without background listeners', async () => {
    let listener: ((user: User | null) => void) | undefined;
    mocks.watchUser.mockImplementation((callback) => {
      listener = callback;
      return () => undefined;
    });
    render(<App />);
    await act(async () =>
      listener?.({
        uid: 'owner',
        email: 'owner@spark.local'
      } as User)
    );

    expect(
      await screen.findByRole('heading', { name: 'App config' })
    ).toBeInTheDocument();
    await waitFor(() => expect(mocks.config).toHaveBeenCalledTimes(1));
    expect(
      screen.getByText(/switches are all off in baked defaults/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Overview/ }));
    expect(
      await screen.findByRole('heading', { name: 'Overview' })
    ).toBeInTheDocument();
    await waitFor(() => expect(mocks.overview).toHaveBeenCalledTimes(1));
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(
      screen.getByText(/Habit names, completions, focus titles/)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(mocks.logOut).toHaveBeenCalledTimes(1);
  });
});
