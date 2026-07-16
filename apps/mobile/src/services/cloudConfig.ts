import {
  appConfigSchema,
  defaultAppConfig,
  type AppConfig
} from '@spark/cloud-contracts';
import Constants from 'expo-constants';
import Storage from 'expo-sqlite/kv-store';

const CACHE_KEY = 'spark.remote-config.v1';
const CACHE_TIME_KEY = 'spark.remote-config.checked-at.v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function apiUrl(): string {
  return String(Constants.expoConfig?.extra?.sparkApiUrl || '').replace(/\/$/, '');
}

export function cloudConfigured(): boolean {
  return apiUrl().startsWith('https://') || apiUrl().startsWith('http://localhost');
}

export async function loadAppConfig(force = false): Promise<AppConfig> {
  const cachedRaw = await Storage.getItem(CACHE_KEY);
  const checkedAt = Number(await Storage.getItem(CACHE_TIME_KEY));
  if (!force && cachedRaw && Date.now() - checkedAt < MAX_AGE_MS) {
    const parsed = appConfigSchema.safeParse(JSON.parse(cachedRaw));
    if (parsed.success) return parsed.data;
  }
  if (!cloudConfigured()) return defaultAppConfig;
  try {
    const response = await fetch(`${apiUrl()}/v1/config`, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`Config request failed (${response.status})`);
    const parsed = appConfigSchema.parse(await response.json());
    await Storage.setItem(CACHE_KEY, JSON.stringify(parsed));
    await Storage.setItem(CACHE_TIME_KEY, String(Date.now()));
    return parsed;
  } catch {
    if (cachedRaw) {
      const parsed = appConfigSchema.safeParse(JSON.parse(cachedRaw));
      if (parsed.success) return parsed.data;
    }
    return defaultAppConfig;
  }
}
