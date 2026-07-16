import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./firebase', () => ({
  adminToken: vi.fn(async () => 'admin-token')
}));

function response(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn(async () => body)
  } as unknown as Response;
}

describe('admin API client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_SPARK_ADMIN_ENABLED', 'true');
    vi.stubEnv('VITE_SPARK_API_URL', 'https://admin-api.example.test/');
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('stays disabled unless both the explicit flag and a safe URL exist', async () => {
    vi.stubEnv('VITE_SPARK_ADMIN_ENABLED', 'false');
    let api = await import('./api');
    expect(api.apiConfigured()).toBe(false);
    await expect(api.adminApi.overview()).rejects.toThrow(
      'VITE_SPARK_API_URL is missing'
    );

    vi.resetModules();
    vi.stubEnv('VITE_SPARK_ADMIN_ENABLED', 'true');
    vi.stubEnv('VITE_SPARK_API_URL', 'http://insecure.example.test');
    api = await import('./api');
    expect(api.apiConfigured()).toBe(false);
  });

  it('adds the admin token and JSON headers to privileged requests', async () => {
    vi.mocked(fetch).mockResolvedValue(response({ users: 1, openSupport: 0, premium: 0 }));
    const { adminApi, apiConfigured } = await import('./api');
    expect(apiConfigured()).toBe(true);
    await expect(adminApi.overview()).resolves.toMatchObject({ users: 1 });
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe('https://admin-api.example.test/v1/admin/overview');
    const headers = (init as RequestInit).headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer admin-token');
    expect(headers.get('Accept')).toBe('application/json');
  });

  it('builds bounded encoded query strings for users, support, messages, and audits', async () => {
    vi.mocked(fetch).mockResolvedValue(response({ items: [], nextCursor: null }));
    const { adminApi } = await import('./api');
    await adminApi.users('next cursor', 'person@example.com');
    await adminApi.support('open', 'support cursor');
    await adminApi.messages('thread/one', 'message cursor');
    await adminApi.audits('audit cursor', { target: 'user/one' });
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(urls[0]).toContain(
      'limit=50&cursor=next+cursor&search=person%40example.com'
    );
    expect(urls[1]).toContain('status=open&limit=50&cursor=support+cursor');
    expect(urls[2]).toContain(
      '/thread%2Fone/messages?limit=100&cursor=message+cursor'
    );
    expect(urls[3]).toContain(
      'limit=50&cursor=audit+cursor&target=user%2Fone'
    );
  });

  it('keeps public config unauthenticated and serializes mutations', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ schemaVersion: 1 }))
      .mockResolvedValueOnce(response({ id: 'message' }, true, 201))
      .mockResolvedValueOnce(response({ premium: true }));
    const { adminApi } = await import('./api');
    await adminApi.config();
    const configHeaders = vi.mocked(fetch).mock.calls[0]![1]!.headers as Headers;
    expect(configHeaders.get('Authorization')).toBeNull();
    await adminApi.reply('thread', 'Hello');
    expect(vi.mocked(fetch).mock.calls[1]![1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ text: 'Hello' })
    });
    await adminApi.grant('uid/one', true, 'Accessibility tester');
    expect(String(vi.mocked(fetch).mock.calls[2]![0])).toContain('uid%2Fone');
    expect(vi.mocked(fetch).mock.calls[2]![1]).toMatchObject({
      body: JSON.stringify({
        premium: true,
        reason: 'Accessibility tester'
      })
    });
  });

  it('uses server error messages and a safe generic fallback', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response({ message: 'Not allowed.' }, false, 403))
      .mockResolvedValueOnce(response(null, false, 500));
    const { adminApi } = await import('./api');
    await expect(adminApi.overview()).rejects.toThrow('Not allowed.');
    await expect(adminApi.overview()).rejects.toThrow(
      'Admin request failed (500)'
    );
  });
});
