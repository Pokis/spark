import type { AppConfig } from '@spark/cloud-contracts';
import { adminToken } from './firebase';
import type {
  AdminUser,
  Overview,
  PromoCode,
  SupportMessage,
  SupportThread
} from './types';

const apiUrl = String(import.meta.env.VITE_SPARK_API_URL || '').replace(/\/$/, '');

export function apiConfigured(): boolean {
  return apiUrl.startsWith('https://') || apiUrl.startsWith('http://localhost');
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
  users: () => request<AdminUser[]>('/v1/admin/users'),
  support: (status = 'all') =>
    request<SupportThread[]>(`/v1/admin/support?status=${encodeURIComponent(status)}`),
  messages: (id: string) =>
    request<SupportMessage[]>(`/v1/admin/support/${encodeURIComponent(id)}/messages`),
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
  promos: () => request<PromoCode[]>('/v1/admin/promo-codes'),
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
