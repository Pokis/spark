import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  PlayPublisherError,
  buildTrackRelease,
  createServiceAccountAssertion,
  deriveReleaseLinks,
  normalizeReleaseNotes,
  parseArguments,
  runPublisher,
  validateServiceAccountCredential,
} from './google-play-publisher.mjs';

function testCredential() {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    type: 'service_account',
    client_email: 'publisher@example.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    private_key_id: 'test-key',
    token_uri: 'https://oauth2.googleapis.com/token',
  };
}

test('parses named arguments without accepting loose values', () => {
  assert.deepEqual(parseArguments(['--action', 'inspect', '--package', 'com.example.app']), {
    action: 'inspect',
    package: 'com.example.app',
  });
  assert.throws(() => parseArguments(['loose']), PlayPublisherError);
  assert.throws(() => parseArguments(['--action']), /Missing value/);
});

test('validates and signs a service-account assertion without exposing its private key', () => {
  const credential = testCredential();
  assert.equal(validateServiceAccountCredential(credential).clientEmail, credential.client_email);
  const assertion = createServiceAccountAssertion(credential, 1_700_000_000);
  assert.equal(assertion.split('.').length, 3);
  assert.equal(assertion.includes('BEGIN PRIVATE KEY'), false);
  assert.throws(
    () => validateServiceAccountCredential({ ...credential, token_uri: 'https://example.com/token' }),
    /Refusing unexpected/,
  );
});

test('normalizes localized release notes and enforces Play length limits', () => {
  assert.deepEqual(normalizeReleaseNotes({ 'en-US': 'Clearer navigation.' }), [
    { language: 'en-US', text: 'Clearer navigation.' },
  ]);
  assert.throws(() => normalizeReleaseNotes({ bad_language_: 'Text' }), /Invalid/);
  assert.throws(() => normalizeReleaseNotes({ 'en-US': 'x'.repeat(501) }), /1 to 500/);
});

test('builds completed and staged track releases safely', () => {
  assert.deepEqual(buildTrackRelease({
    versionCode: 3,
    releaseName: '0.1.1 (3)',
    releaseStatus: 'completed',
    releaseNotes: [],
  }), {
    name: '0.1.1 (3)',
    versionCodes: ['3'],
    status: 'completed',
  });
  assert.equal(buildTrackRelease({
    versionCode: 4,
    releaseName: '0.1.2 (4)',
    releaseStatus: 'inProgress',
    rolloutFraction: 0.1,
    releaseNotes: [],
  }).userFraction, 0.1);
  assert.throws(() => buildTrackRelease({
    versionCode: 4,
    releaseName: '0.1.2 (4)',
    releaseStatus: 'inProgress',
    rolloutFraction: 1,
    releaseNotes: [],
  }), /rollout fraction/);
});

test('derives public links and leaves unknown console-specific links null', () => {
  const basic = deriveReleaseLinks('com.example.app', {
    privacyPolicyUrl: 'https://example.com/privacy',
  });
  assert.equal(basic.playStoreListing, 'https://play.google.com/store/apps/details?id=com.example.app');
  assert.equal(basic.playConsoleAppDashboard, null);
  const detailed = deriveReleaseLinks('com.example.app', {
    console: { developerId: '123', appId: '456' },
  });
  assert.match(detailed.playConsoleAppDashboard, /developers\/123\/app\/456/);
});

test('inspects Play state through a disposable edit without leaking credentials', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'spark-play-inspect-'));
  try {
    const credential = testCredential();
    const credentialPath = join(directory, 'credential.json');
    writeFileSync(credentialPath, JSON.stringify(credential));
    const calls = [];
    const fetchImpl = async (url, options = {}) => {
      calls.push({ url: String(url), method: options.method ?? 'GET', authorization: options.headers?.Authorization });
      if (String(url).includes('oauth2.googleapis.com/token')) {
        assert.equal(String(options.body).includes(credential.private_key), false);
        return new Response(JSON.stringify({ access_token: 'short-lived-token' }), { status: 200 });
      }
      assert.equal(options.headers.Authorization, 'Bearer short-lived-token');
      if (String(url).endsWith('/edits') && options.method === 'POST') {
        return new Response(JSON.stringify({ id: 'edit-inspect' }), { status: 200 });
      }
      if (String(url).endsWith('/bundles')) {
        return new Response(JSON.stringify({ bundles: [{ versionCode: 1 }, { versionCode: 2 }] }), { status: 200 });
      }
      if (String(url).endsWith('/tracks')) {
        return new Response(JSON.stringify({ tracks: [{ track: 'internal', releases: [] }] }), { status: 200 });
      }
      if (options.method === 'DELETE') return new Response('', { status: 200 });
      throw new Error(`Unexpected mock request: ${options.method} ${url}`);
    };
    const result = await runPublisher({
      action: 'inspect',
      package: 'com.example.app',
      'service-account-key': credentialPath,
    }, { fetchImpl });
    assert.equal(result.maxVersionCode, 2);
    assert.equal(result.serviceAccountEmail, credential.client_email);
    assert.equal(JSON.stringify(result).includes(credential.private_key), false);
    assert.equal(calls.some((call) => call.method === 'DELETE'), true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('uploads, validates, and commits a testing release as one API transaction', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'spark-play-publish-'));
  try {
    const credential = testCredential();
    const credentialPath = join(directory, 'credential.json');
    const aabPath = join(directory, 'release.aab');
    writeFileSync(credentialPath, JSON.stringify(credential));
    writeFileSync(aabPath, 'test app bundle');
    const stages = [];
    const fetchImpl = async (url, options = {}) => {
      const target = String(url);
      if (target.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 'publish-token' }), { status: 200 });
      }
      if (target.endsWith('/edits') && options.method === 'POST') {
        stages.push('insert');
        return new Response(JSON.stringify({ id: 'edit-publish' }), { status: 200 });
      }
      if (target.includes('/tracks/internal') && options.method === 'GET') {
        stages.push('read-track');
        return new Response(JSON.stringify({ error: { message: 'not found' } }), { status: 404 });
      }
      if (target.includes('/upload/androidpublisher/') && options.method === 'POST') {
        stages.push('upload');
        for await (const _chunk of options.body) {
          // Consume the file stream like fetch does before the temporary fixture is removed.
        }
        return new Response(JSON.stringify({ versionCode: 3 }), { status: 200 });
      }
      if (target.includes('/tracks/internal') && options.method === 'PUT') {
        stages.push('update-track');
        const body = JSON.parse(options.body);
        assert.deepEqual(body.releases[0].versionCodes, ['3']);
        assert.equal(body.releases[0].status, 'completed');
        return new Response(JSON.stringify(body), { status: 200 });
      }
      if (target.endsWith(':validate')) {
        stages.push('validate');
        return new Response(JSON.stringify({ id: 'edit-publish' }), { status: 200 });
      }
      if (target.endsWith(':commit')) {
        stages.push('commit');
        return new Response(JSON.stringify({ id: 'edit-publish' }), { status: 200 });
      }
      if (options.method === 'DELETE') {
        stages.push('delete');
        return new Response('', { status: 200 });
      }
      throw new Error(`Unexpected mock request: ${options.method} ${url}`);
    };
    const result = await runPublisher({
      action: 'publish',
      package: 'com.example.app',
      'service-account-key': credentialPath,
      aab: aabPath,
      track: 'internal',
      'release-status': 'completed',
      'release-name': '0.1.1 (3)',
      'version-code': '3',
    }, { fetchImpl });
    assert.equal(result.uploadedVersionCode, 3);
    assert.deepEqual(stages, ['insert', 'read-track', 'upload', 'update-track', 'validate', 'commit']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
