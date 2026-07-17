# Security maintenance

## Current dependency audit

The dependency audit was last reviewed on 2026-07-17.

`npm audit --omit=dev` reports one moderate advisory repeated across 21 transitive dependency
instances:
`GHSA-w5hq-g745-h8pq` in `uuid` versions earlier than 11.1.1. The affected operation is the
optional caller-supplied output buffer used by UUID v3, v5, and v6.

Spark does not call those APIs. The affected copies currently arrive through:

- Expo configuration tooling, including the configuration paths used by Expo, Expo Sharing,
  Splash Screen, and `xcode`; this is principally build/configuration tooling rather than Spark
  application logic.
- the latest compatible Firebase Admin / Google Cloud dependency chain used by the optional
  control plane.

The installed parent packages do not currently expose a non-breaking audit resolution.
Do not use `npm audit fix --force`: it can replace Expo or Firebase packages with incompatible
major versions. Dependabot is configured to check weekly. Re-run the commands below when those
parent packages publish compatible updates:

The full development-dependency audit additionally reports three moderate instances of
`GHSA-8988-4f7v-96qf` in OpenTelemetry Core through `firebase-tools` → Google Cloud Pub/Sub. It is
development/deployment tooling, not the mobile or deployed control-plane runtime. npm's proposed
forced resolution is a breaking `firebase-tools` downgrade, so it is also tracked instead of
forced. There are no high or critical npm advisories in the current lockfile.

```powershell
npm.cmd audit --omit=dev
npm.cmd audit
npm.cmd outdated
```

## Reporting a vulnerability

Do not put secrets, purchase tokens, user identifiers, or private support messages in a public
issue. Send the project owner a private report containing the affected version, reproduction
steps, impact, and any suggested mitigation.

## Operational rules

- Never place service-account JSON in this repository.
- Keep the Spark application's Android upload key at the ignored
  `apps/mobile/credentials/spark-upload.p12` path only while building. Back up the `.p12`, its
  unique 20+ character password, alias `spark-upload`, and printed SHA-256 file hash in LastPass.
  Never commit, email, chat, screenshot, or place the password in `.env`, Gradle properties, or a
  command-line argument.
- Create the upload key only with `.\spark.cmd release -Action LocalSetup`. Build with
  `LocalBuild`, which requests the password through a hidden prompt, uses one non-daemon Gradle
  process, clears the temporary process environment, and verifies the resulting AAB is not signed
  by the Android debug certificate.
- Do not generate a replacement upload key when moving PCs. Restore the same key/password from
  LastPass. If the upload key is truly lost or compromised after Play enrollment, follow Google
  Play's authenticated upload-key reset process and record the incident.
- Use Cloud Run's service identity and Application Default Credentials.
- Keep Firestore client rules deny-by-default; all cloud data access goes through the API.
- Restrict admin access with the email allowlist and Firebase custom roles.
- Rotate any credential immediately if it appears in a log, screenshot, issue, or commit.
- Keep Play purchase verification server-side.
- Review admin audit events after grants, promo assignments, and role changes.

## Local privacy and portable-data controls

- Native app data uses SQLCipher with a random key stored as
  `WHEN_UNLOCKED_THIS_DEVICE_ONLY`.
- Android OS Auto Backup is disabled (`allowBackup=false`). User-controlled exports and the
  explicitly selected encrypted backup folder are the recovery paths.
- Password/recovery-code backups use PBKDF2-SHA256 (150,000 iterations) and authenticated
  AES-256-GCM with a fresh 16-byte salt and 12-byte nonce. Header metadata is authenticated.
- Wrong keys, modified authentication tags, unsupported formats, oversized input, invalid
  references, and reversed plan/experiment dates fail before the current database is replaced.
- Manual backup passwords are not stored. The optional automatic-backup recovery code stays in
  SecureStore and has no server recovery path.
- Automatic Android backup has access only to one user-selected SAF folder, writes at most daily
  when the app is opened/changed, and removes its own files beyond the seven newest.
- Portable snapshots clear the device-specific folder URI, automatic-backup state, active app
  lock, and temporary Quiet now value.
- App lock delegates authentication to the operating system; Spark never handles biometric
  templates or device credentials. Missing enrollment disables the lock to avoid lockout.
- Android sensitive-preview protection uses secure-window behavior and therefore also blocks
  screenshots while enabled. iOS uses app-switcher snapshot protection. The release manifest
  keeps Android's screen-capture detection permission required by the Expo module, but removes
  its unrelated `READ_MEDIA_IMAGES` declaration; Spark does not subscribe to or upload screenshot
  events.
- Calendar integration uses only system create-event UI. Android calendar permissions are
  explicitly removed from the generated manifest.
- Diagnostics contain only platform/app state, counts, safe setting names, and redacted technical
  errors. Habit, focus, routine, Capture, weekly-reflection, departure, experiment-note,
  display-name, local-path, and content-URI text are excluded.
- Progress cards render only completions the user checks and are shared through the system sheet;
  Spark stores no recipient or social graph.

## 2026-07-17 repository and native scan

- Expo Doctor passed 20/20 dependency, config, peer, and React Native compatibility checks.
- A repository scan found no private-key, OpenAI-style secret, Firebase API-key, or service-account
  private-key patterns outside ignored dependency/generated directories. `gitleaks` and `semgrep`
  are not installed locally, so CI should add one of them before accepting outside contributors.
- The regenerated release APK is `com.djpokis.sparkhabits.app` version `0.1.0` / code `1`, targets
  API 36, and contains none of the calendar, media/storage, overlay, camera, microphone-recording,
  or location permissions checked by the release scan; cleartext traffic is not enabled and
  `allowBackup=false`.
- All six Spark widget receivers are non-exported. Exported third-party components are the main
  deep-link/share activity, a read-only widget-image provider scoped to its dedicated image
  directory, and AndroidX/Firebase receivers/services protected by their documented platform
  permissions.
- Gradle successfully produced the native release APK after the package rename and manifest
  hardening. Upstream
  Gradle/Kotlin deprecation warnings remain dependency-maintenance items, not build failures.
- The local production AAB workflow was also exercised end to end with a disposable PKCS#12 key:
  the non-debug signature and Gradle-emitted bundle/package/version metadata were verified, then
  both the disposable key and test AAB were deleted. The real upload key remains user-created so
  its password can go directly from LastPass into hidden prompts without appearing in automation
  logs.
