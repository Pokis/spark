import { createSign } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const ANDROID_PUBLISHER_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const ANDROID_PUBLISHER_UPLOAD_BASE = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3';
const GOOGLE_TOKEN_URI = 'https://oauth2.googleapis.com/token';

export class PlayPublisherError extends Error {
  constructor(message, { stage = 'unknown', statusCode = null, details = null } = {}) {
    super(message);
    this.name = 'PlayPublisherError';
    this.stage = stage;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      throw new PlayPublisherError(`Unexpected argument: ${token}`, { stage: 'arguments' });
    }
    const name = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new PlayPublisherError(`Missing value for --${name}.`, { stage: 'arguments' });
    }
    values[name] = value;
    index += 1;
  }
  return values;
}

function requireArgument(args, name) {
  const value = args[name];
  if (!value) {
    throw new PlayPublisherError(`--${name} is required.`, { stage: 'arguments' });
  }
  return value;
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new PlayPublisherError(`${label} is not valid JSON: ${error.message}`, {
      stage: 'configuration',
    });
  }
}

export function validateServiceAccountCredential(credential) {
  if (
    credential?.type !== 'service_account' ||
    typeof credential.client_email !== 'string' ||
    !credential.client_email.endsWith('.iam.gserviceaccount.com') ||
    typeof credential.private_key !== 'string' ||
    !credential.private_key.includes('BEGIN PRIVATE KEY')
  ) {
    throw new PlayPublisherError(
      'The Google credential must be a service-account JSON key with client_email and private_key.',
      { stage: 'credentials' },
    );
  }
  if (credential.token_uri && credential.token_uri !== GOOGLE_TOKEN_URI) {
    throw new PlayPublisherError(
      `Refusing unexpected service-account token URI: ${credential.token_uri}`,
      { stage: 'credentials' },
    );
  }
  return {
    clientEmail: credential.client_email,
    privateKeyId: credential.private_key_id ?? null,
  };
}

export function createServiceAccountAssertion(credential, nowSeconds = Math.floor(Date.now() / 1000)) {
  validateServiceAccountCredential(credential);
  const header = base64Url(JSON.stringify({
    alg: 'RS256',
    typ: 'JWT',
    ...(credential.private_key_id ? { kid: credential.private_key_id } : {}),
  }));
  const claims = base64Url(JSON.stringify({
    iss: credential.client_email,
    scope: ANDROID_PUBLISHER_SCOPE,
    aud: GOOGLE_TOKEN_URI,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${base64Url(signer.sign(credential.private_key))}`;
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 4000) };
  }
}

function responseErrorMessage(body, fallback) {
  return body?.error?.message || body?.message || body?.raw || fallback;
}

async function requestAccessToken(credential, fetchImpl = fetch) {
  const assertion = createServiceAccountAssertion(credential);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  let response;
  try {
    response = await fetchImpl(GOOGLE_TOKEN_URI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new PlayPublisherError(`Could not reach Google OAuth: ${error.message}`, {
      stage: 'authentication',
    });
  }
  const result = await parseResponseBody(response);
  if (!response.ok || !result?.access_token) {
    throw new PlayPublisherError(
      responseErrorMessage(result, `Google OAuth returned HTTP ${response.status}.`),
      { stage: 'authentication', statusCode: response.status, details: result?.error ?? null },
    );
  }
  return result.access_token;
}

async function publisherRequest(
  accessToken,
  url,
  { method = 'GET', body = undefined, stage, timeoutMs = 180_000, fetchImpl = fetch } = {},
) {
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new PlayPublisherError(`Could not reach Google Play: ${error.message}`, { stage });
  }
  const result = await parseResponseBody(response);
  if (!response.ok) {
    throw new PlayPublisherError(
      responseErrorMessage(result, `Google Play returned HTTP ${response.status}.`),
      { stage, statusCode: response.status, details: result?.error?.errors ?? null },
    );
  }
  return result;
}

function applicationUrl(packageName, suffix = '') {
  return `${ANDROID_PUBLISHER_BASE}/applications/${encodeURIComponent(packageName)}${suffix}`;
}

async function insertEdit(accessToken, packageName, fetchImpl) {
  return publisherRequest(accessToken, applicationUrl(packageName, '/edits'), {
    method: 'POST',
    body: {},
    stage: 'create-edit',
    fetchImpl,
  });
}

async function deleteEdit(accessToken, packageName, editId, fetchImpl) {
  return publisherRequest(
    accessToken,
    applicationUrl(packageName, `/edits/${encodeURIComponent(editId)}`),
    { method: 'DELETE', stage: 'delete-edit', fetchImpl },
  );
}

async function listBundles(accessToken, packageName, editId, fetchImpl) {
  const result = await publisherRequest(
    accessToken,
    applicationUrl(packageName, `/edits/${encodeURIComponent(editId)}/bundles`),
    { stage: 'list-bundles', fetchImpl },
  );
  return Array.isArray(result?.bundles) ? result.bundles : [];
}

async function listTracks(accessToken, packageName, editId, fetchImpl) {
  const result = await publisherRequest(
    accessToken,
    applicationUrl(packageName, `/edits/${encodeURIComponent(editId)}/tracks`),
    { stage: 'list-tracks', fetchImpl },
  );
  return Array.isArray(result?.tracks) ? result.tracks : [];
}

async function uploadBundle(accessToken, packageName, editId, aabPath, fetchImpl = fetch) {
  const size = statSync(aabPath).size;
  const url = `${ANDROID_PUBLISHER_UPLOAD_BASE}/applications/${encodeURIComponent(packageName)}` +
    `/edits/${encodeURIComponent(editId)}/bundles?uploadType=media`;
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(size),
      },
      body: createReadStream(aabPath),
      duplex: 'half',
      signal: AbortSignal.timeout(15 * 60_000),
    });
  } catch (error) {
    throw new PlayPublisherError(`Could not upload the bundle to Google Play: ${error.message}`, {
      stage: 'upload-bundle',
    });
  }
  const result = await parseResponseBody(response);
  if (!response.ok) {
    throw new PlayPublisherError(
      responseErrorMessage(result, `Google Play bundle upload returned HTTP ${response.status}.`),
      { stage: 'upload-bundle', statusCode: response.status, details: result?.error?.errors ?? null },
    );
  }
  return result;
}

export function normalizeReleaseNotes(value) {
  if (!value) return [];
  const entries = Array.isArray(value)
    ? value
    : Object.entries(value).map(([language, text]) => ({ language, text }));
  return entries.map((entry) => {
    const language = String(entry.language ?? '').trim();
    const text = String(entry.text ?? '').trim();
    if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(language)) {
      throw new PlayPublisherError(`Invalid release-note language: ${language || '(empty)'}`, {
        stage: 'configuration',
      });
    }
    if (!text || [...text].length > 500) {
      throw new PlayPublisherError(
        `Release notes for ${language} must contain 1 to 500 characters.`,
        { stage: 'configuration' },
      );
    }
    return { language, text };
  });
}

export function buildTrackRelease({
  versionCode,
  releaseName,
  releaseStatus,
  rolloutFraction = null,
  releaseNotes = [],
}) {
  const allowedStatuses = new Set(['draft', 'completed', 'inProgress']);
  if (!allowedStatuses.has(releaseStatus)) {
    throw new PlayPublisherError(`Unsupported release status: ${releaseStatus}`, {
      stage: 'configuration',
    });
  }
  const numericCode = Number(versionCode);
  if (!Number.isSafeInteger(numericCode) || numericCode < 1) {
    throw new PlayPublisherError(`Invalid Android version code: ${versionCode}`, {
      stage: 'configuration',
    });
  }
  if (!releaseName || [...releaseName].length > 50) {
    throw new PlayPublisherError('The release name must contain 1 to 50 characters.', {
      stage: 'configuration',
    });
  }
  if (releaseStatus === 'inProgress') {
    if (!(rolloutFraction > 0 && rolloutFraction < 1)) {
      throw new PlayPublisherError(
        'An inProgress release requires a rollout fraction greater than 0 and less than 1.',
        { stage: 'configuration' },
      );
    }
  } else if (rolloutFraction !== null && rolloutFraction !== undefined) {
    throw new PlayPublisherError('A rollout fraction is valid only for an inProgress release.', {
      stage: 'configuration',
    });
  }
  return {
    name: releaseName,
    versionCodes: [String(numericCode)],
    status: releaseStatus,
    ...(releaseStatus === 'inProgress' ? { userFraction: rolloutFraction } : {}),
    ...(releaseNotes.length ? { releaseNotes } : {}),
  };
}

function cleanTrackForOutput(track) {
  return {
    track: track.track,
    releases: (track.releases ?? []).map((release) => ({
      name: release.name ?? null,
      status: release.status ?? null,
      userFraction: release.userFraction ?? null,
      versionCodes: release.versionCodes ?? [],
    })),
  };
}

export function deriveReleaseLinks(packageName, publisherConfig = {}) {
  const consoleConfig = publisherConfig.console ?? {};
  const projectId = publisherConfig.googleCloudProjectId || null;
  const developerId = consoleConfig.developerId || null;
  const appId = consoleConfig.appId || null;
  const consoleAppBase = developerId && appId
    ? `https://play.google.com/console/developers/${encodeURIComponent(developerId)}` +
      `/app/${encodeURIComponent(appId)}`
    : null;
  return {
    playConsoleRoot: developerId
      ? `https://play.google.com/console/developers/${encodeURIComponent(developerId)}/app-list`
      : 'https://play.google.com/console/developers',
    playConsoleAppDashboard: consoleConfig.appDashboardUrl ||
      (consoleAppBase ? `${consoleAppBase}/app-dashboard` : null),
    playConsoleInternalTesting: consoleConfig.internalTestingUrl || null,
    playConsoleClosedTesting: consoleConfig.closedTestingUrl || null,
    playConsoleProduction: consoleConfig.productionUrl || null,
    playConsolePublishingOverview: consoleConfig.publishingOverviewUrl || null,
    playConsolePreLaunchReport: consoleConfig.preLaunchReportUrl || null,
    playConsoleAndroidVitals: consoleConfig.androidVitalsUrl || null,
    playConsoleUsersAndPermissions: 'https://play.google.com/console/developers',
    playStoreListing: `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}`,
    androidStoreDeepLink: `market://details?id=${packageName}`,
    internalTestingOptIn: consoleConfig.internalTestingOptInUrl || null,
    closedTestingOptIn: consoleConfig.closedTestingOptInUrl || null,
    privacyPolicy: publisherConfig.privacyPolicyUrl || null,
    googleCloudProject: projectId
      ? `https://console.cloud.google.com/home/dashboard?project=${encodeURIComponent(projectId)}`
      : null,
    googleCloudPublisherApi: projectId
      ? `https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com?project=${encodeURIComponent(projectId)}`
      : null,
    googleCloudServiceAccounts: projectId
      ? `https://console.cloud.google.com/iam-admin/serviceaccounts?project=${encodeURIComponent(projectId)}`
      : null,
  };
}

function loadPublisherConfig(path, expectedPackageName) {
  if (!path || !existsSync(path)) return {};
  const config = readJson(path, 'Publisher configuration');
  if (config.packageName && config.packageName !== expectedPackageName) {
    throw new PlayPublisherError(
      `Publisher configuration package ${config.packageName} does not match ${expectedPackageName}.`,
      { stage: 'configuration' },
    );
  }
  return config;
}

function loadReleaseNotes(path) {
  if (!path) return [];
  if (!existsSync(path)) {
    throw new PlayPublisherError(`Release-notes file does not exist: ${path}`, {
      stage: 'configuration',
    });
  }
  return normalizeReleaseNotes(readJson(path, 'Release-notes file'));
}

function maxBundleVersionCode(bundles) {
  return bundles.reduce((maximum, bundle) => {
    const value = Number(bundle.versionCode);
    return Number.isSafeInteger(value) ? Math.max(maximum, value) : maximum;
  }, 0);
}

async function inspectPublisher({ accessToken, packageName, fetchImpl = fetch }) {
  const edit = await insertEdit(accessToken, packageName, fetchImpl);
  let deleted = false;
  try {
    const bundles = await listBundles(accessToken, packageName, edit.id, fetchImpl);
    const tracks = await listTracks(accessToken, packageName, edit.id, fetchImpl);
    await deleteEdit(accessToken, packageName, edit.id, fetchImpl);
    deleted = true;
    return {
      editId: edit.id,
      maxVersionCode: maxBundleVersionCode(bundles),
      bundles: bundles.map((bundle) => ({
        versionCode: Number(bundle.versionCode),
        sha1: bundle.sha1 ?? null,
        sha256: bundle.sha256 ?? null,
      })),
      tracks: tracks.map(cleanTrackForOutput),
    };
  } finally {
    if (!deleted) {
      try {
        await deleteEdit(accessToken, packageName, edit.id, fetchImpl);
      } catch {
        // The original error is more useful than cleanup failure.
      }
    }
  }
}

async function publishBundle({
  accessToken,
  packageName,
  aabPath,
  versionCode,
  track,
  release,
  fetchImpl = fetch,
}) {
  const edit = await insertEdit(accessToken, packageName, fetchImpl);
  let committed = false;
  let uploadedVersionCode = null;
  try {
    const priorTrack = await publisherRequest(
      accessToken,
      applicationUrl(packageName, `/edits/${encodeURIComponent(edit.id)}/tracks/${encodeURIComponent(track)}`),
      { stage: 'read-track', fetchImpl },
    ).catch((error) => {
      if (error instanceof PlayPublisherError && error.statusCode === 404) return null;
      throw error;
    });
    const bundle = await uploadBundle(accessToken, packageName, edit.id, aabPath, fetchImpl);
    uploadedVersionCode = Number(bundle.versionCode);
    if (uploadedVersionCode !== Number(versionCode)) {
      throw new PlayPublisherError(
        `Google Play reported uploaded version code ${uploadedVersionCode}; expected ${versionCode}.`,
        { stage: 'verify-upload' },
      );
    }
    const updatedTrack = await publisherRequest(
      accessToken,
      applicationUrl(packageName, `/edits/${encodeURIComponent(edit.id)}/tracks/${encodeURIComponent(track)}`),
      {
        method: 'PUT',
        body: { track, releases: [release] },
        stage: 'update-track',
        fetchImpl,
      },
    );
    await publisherRequest(
      accessToken,
      applicationUrl(packageName, `/edits/${encodeURIComponent(edit.id)}:validate`),
      { method: 'POST', stage: 'validate-edit', fetchImpl },
    );
    const committedEdit = await publisherRequest(
      accessToken,
      applicationUrl(packageName, `/edits/${encodeURIComponent(edit.id)}:commit`),
      { method: 'POST', stage: 'commit-edit', fetchImpl },
    );
    committed = true;
    return {
      editId: edit.id,
      committedEditId: committedEdit?.id ?? edit.id,
      uploadedVersionCode,
      priorTrack: priorTrack ? cleanTrackForOutput(priorTrack) : null,
      resultingTrack: cleanTrackForOutput(updatedTrack),
    };
  } catch (error) {
    if (error && typeof error === 'object') {
      error.editId = edit.id;
      error.uploadedVersionCode = uploadedVersionCode;
    }
    throw error;
  } finally {
    if (!committed) {
      try {
        await deleteEdit(accessToken, packageName, edit.id, fetchImpl);
      } catch {
        // Preserve the publishing failure. A later inspection checks the actual state.
      }
    }
  }
}

function safeError(error) {
  return {
    name: error?.name ?? 'Error',
    message: error?.message ?? String(error),
    stage: error?.stage ?? 'unknown',
    statusCode: error?.statusCode ?? null,
    details: error?.details ?? null,
    editId: error?.editId ?? null,
    uploadedVersionCode: error?.uploadedVersionCode ?? null,
  };
}

function writeOutput(path, value) {
  if (!path) return;
  const resolved = resolve(path);
  writeFileSync(resolved, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8' });
}

export async function runPublisher(args, { fetchImpl = fetch } = {}) {
  const action = requireArgument(args, 'action');
  if (!['inspect', 'publish'].includes(action)) {
    throw new PlayPublisherError(`Unsupported action: ${action}`, { stage: 'arguments' });
  }
  const packageName = requireArgument(args, 'package');
  if (!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(packageName)) {
    throw new PlayPublisherError(`Invalid Android package name: ${packageName}`, {
      stage: 'arguments',
    });
  }
  const credentialPath = resolve(requireArgument(args, 'service-account-key'));
  if (!existsSync(credentialPath)) {
    throw new PlayPublisherError(`Service-account key does not exist: ${credentialPath}`, {
      stage: 'credentials',
    });
  }
  const credential = readJson(credentialPath, 'Service-account key');
  const credentialInfo = validateServiceAccountCredential(credential);
  const publisherConfig = loadPublisherConfig(
    args['publisher-config'] ? resolve(args['publisher-config']) : null,
    packageName,
  );
  const accessToken = await requestAccessToken(credential, fetchImpl);
  const common = {
    serviceAccountEmail: credentialInfo.clientEmail,
    links: deriveReleaseLinks(packageName, publisherConfig),
  };
  if (action === 'inspect') {
    return {
      ...common,
      ...(await inspectPublisher({ accessToken, packageName, fetchImpl })),
    };
  }

  const aabPath = resolve(requireArgument(args, 'aab'));
  if (!existsSync(aabPath) || !aabPath.toLowerCase().endsWith('.aab')) {
    throw new PlayPublisherError(`Android App Bundle does not exist or is not .aab: ${aabPath}`, {
      stage: 'artifact',
    });
  }
  const versionCode = Number(requireArgument(args, 'version-code'));
  const track = requireArgument(args, 'track');
  if (!/^[A-Za-z0-9._-]+$/.test(track)) {
    throw new PlayPublisherError(`Invalid Google Play track: ${track}`, { stage: 'arguments' });
  }
  const releaseNotes = loadReleaseNotes(
    args['release-notes'] ? resolve(args['release-notes']) : null,
  );
  const rolloutFraction = args['rollout-fraction'] === undefined
    ? null
    : Number(args['rollout-fraction']);
  const release = buildTrackRelease({
    versionCode,
    releaseName: requireArgument(args, 'release-name'),
    releaseStatus: requireArgument(args, 'release-status'),
    rolloutFraction,
    releaseNotes,
  });
  return {
    ...common,
    ...(await publishBundle({
      accessToken,
      packageName,
      aabPath,
      versionCode,
      track,
      release,
      fetchImpl,
    })),
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  let args = {};
  let result;
  let exitCode = 0;
  try {
    args = parseArguments(process.argv.slice(2));
    const publisherResult = await runPublisher(args);
    result = {
      schemaVersion: 1,
      operation: `google-play-${args.action ?? 'unknown'}`,
      status: 'succeeded',
      startedAt,
      completedAt: new Date().toISOString(),
      packageName: args.package ?? null,
      track: args.track ?? null,
      ...publisherResult,
    };
  } catch (error) {
    exitCode = 1;
    result = {
      schemaVersion: 1,
      operation: `google-play-${args.action ?? 'unknown'}`,
      status: 'failed',
      startedAt,
      completedAt: new Date().toISOString(),
      packageName: args.package ?? null,
      track: args.track ?? null,
      error: safeError(error),
    };
    console.error(`Google Play ${args.action ?? 'operation'} failed: ${result.error.message}`);
  }
  try {
    writeOutput(args.output, result);
  } catch (error) {
    exitCode = 1;
    console.error(`Could not write publisher result JSON: ${error.message}`);
  }
  if (result.status === 'succeeded') {
    console.log(`Google Play ${args.action} succeeded for ${args.package}.`);
  }
  process.exitCode = exitCode;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  await main();
}
