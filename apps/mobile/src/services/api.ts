import {
  appConfigSchema,
  type AppConfig
} from '@spark/cloud-contracts';
import Constants from 'expo-constants';
import { idToken } from './cloudAuth';
import { forgetCloudSession } from './cloudAuth';

export interface SupportThreadSummary {
  id: string;
  subject: string;
  status: 'open' | 'waiting_on_user' | 'resolved';
  lastMessageAt: string;
  unreadByUser: number;
}

export interface SupportMessage {
  id: string;
  author: 'user' | 'admin';
  text: string;
  createdAt: string;
}

export interface CloudEntitlement {
  premium: boolean;
  source: 'none' | 'play' | 'app-store' | 'promo' | 'admin';
  expiresAt: string | null;
}

function baseUrl(): string {
  const value = String(Constants.expoConfig?.extra?.sparkApiUrl || '').replace(/\/$/, '');
  if (!value) throw new Error('Spark cloud services are not configured.');
  return value;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');
  if (authenticated) headers.set('Authorization', `Bearer ${await idToken()}`);
  const response = await fetch(`${baseUrl()}${path}`, { ...init, headers });
  const body = (await response.json().catch(() => null)) as
    | { message?: string }
    | T
    | null;
  if (!response.ok) {
    throw new Error(
      body && typeof body === 'object' && 'message' in body && body.message
        ? body.message
        : `Spark service request failed (${response.status}).`
    );
  }
  return body as T;
}

export async function fetchConfig(): Promise<AppConfig> {
  return appConfigSchema.parse(await request('/v1/config', {}, false));
}

export function listSupportThreads(): Promise<SupportThreadSummary[]> {
  return request('/v1/support/threads');
}

export function createSupportThread(input: {
  subject: string;
  message: string;
  appVersion: string;
  platform: 'android' | 'ios';
}): Promise<{ id: string }> {
  return request('/v1/support/threads', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export function listSupportMessages(threadId: string): Promise<SupportMessage[]> {
  return request(`/v1/support/threads/${encodeURIComponent(threadId)}/messages`);
}

export function sendSupportMessage(threadId: string, text: string): Promise<{ id: string }> {
  return request(`/v1/support/threads/${encodeURIComponent(threadId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text })
  });
}

export function getEntitlement(): Promise<CloudEntitlement> {
  return request('/v1/me/entitlement');
}

export function verifyGooglePurchase(
  productId: string,
  purchaseToken: string
): Promise<CloudEntitlement> {
  return request('/v1/purchases/google/verify', {
    method: 'POST',
    body: JSON.stringify({ productId, purchaseToken })
  });
}

export async function deleteCloudIdentity(): Promise<void> {
  await request('/v1/me', { method: 'DELETE' });
  await forgetCloudSession();
}
