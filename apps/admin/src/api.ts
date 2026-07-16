import type { AppConfig } from '@spark/cloud-contracts';
import { adminToken } from './firebase';
import type {
  AdminUser,
  AuditRecord,
  Overview,
  PageResult,
  PromoCode,
  SupportMessage,
  SupportThread
} from './types';

const apiUrl = String(import.meta.env.VITE_SPARK_API_URL || '').replace(/\/$/, '');

export function apiConfigured(): boolean {
  return (
    import.meta.env.VITE_SPARK_ADMIN_ENABLED === 'true' &&
    (apiUrl.startsWith('https://') || apiUrl.startsWith('http://localhost'))
  );
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  if (!apiConfigured()) throw new Error('VITE_SPARK_API_URL is missing.');
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');
  if (auth) headers.set('Authorization', `Bearer ${await adminToken()}`);
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers });
  const body = (await response.json().catch(() => null)) as
    | T
    | { message?: string }
    | null;
  if (!response.ok) {
    throw new Error(
      body && typeof body === 'object' && 'message' in body && body.message
        ? body.message
        : `Admin request failed (${response.status}).`
    );
  }
  return body as T;
}

export const adminApi = {
  overview: () => request<Overview>('/v1/admin/overview'),
  users: (cursor?: string, search?: string) => {
    const query = new URLSearchParams({ limit: '50' });
    if (cursor) query.set('cursor', cursor);
    if (search) query.set('search', search);
    return request<PageResult<AdminUser>>(`/v1/admin/users?${query}`);
  },
  support: (status = 'all', cursor?: string) => {
    const query = new URLSearchParams({ status, limit: '50' });
    if (cursor) query.set('cursor', cursor);
    return request<PageResult<SupportThread>>(`/v1/admin/support?${query}`);
  },
  messages: (id: string, cursor?: string) => {
    const query = new URLSearchParams({ limit: '100' });
    if (cursor) query.set('cursor', cursor);
    return request<PageResult<SupportMessage>>(
      `/v1/admin/support/${encodeURIComponent(id)}/messages?${query}`
    );
  },
  reply: (id: string, text: string) =>
    request<{ id: string }>(`/v1/admin/support/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text })
    }),
  supportStatus: (id: string, status: SupportThread['status']) =>
    request<void>(`/v1/admin/support/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
  config: () => request<AppConfig>('/v1/config', {}, false),
  saveConfig: (config: Omit<AppConfig, 'updatedAt'>) =>
    request<AppConfig>('/v1/admin/config', {
      method: 'POST',
      body: JSON.stringify(config)
    }),
  promos: (cursor?: string) => {
    const query = new URLSearchParams({ limit: '100' });
    if (cursor) query.set('cursor', cursor);
    return request<PageResult<PromoCode>>(`/v1/admin/promo-codes?${query}`);
  },
  audits: (
    cursor?: string,
    filters: { action?: string; actorId?: string; target?: string } = {}
  ) => {
    const query = new URLSearchParams({ limit: '50' });
    if (cursor) query.set('cursor', cursor);
    for (const [key, value] of Object.entries(filters)) {
      if (value) query.set(key, value);
    }
    return request<PageResult<AuditRecord>>(`/v1/admin/audits?${query}`);
  },
  importPromos: (input: { codes: string[]; campaign: string; productId: string }) =>
    request<{ imported: number }>('/v1/admin/promo-codes/import', {
      method: 'POST',
      body: JSON.stringify(input)
    }),
  assignPromo: (userId: string) =>
    request<{ code: string; productId: string }>('/v1/admin/promo-codes/assign', {
      method: 'POST',
      body: JSON.stringify({ userId })
    }),
  grant: (uid: string, premium: boolean, reason: string) =>
    request(`/v1/admin/users/${encodeURIComponent(uid)}/entitlement`, {
      method: 'POST',
      body: JSON.stringify({ premium, reason })
    }),
  setRole: (email: string, role: 'owner' | 'support' | 'content' | 'none') =>
    request<{ uid: string; email: string }>('/v1/admin/roles', {
      method: 'POST',
      body: JSON.stringify({ email, role })
    })
};
