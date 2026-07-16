# Spark quality and release-readiness review

Last implementation pass: **2026-07-16**

This started as a product and engineering review. Every item that could be implemented without
operator identity, store-console access, Android hardware, or legal decisions has now been applied.
This document records the result and the remaining honest release gates.

## Executive verdict

Spark is ready for local development and is technically suitable for an offline Android internal
test once a native build can be run. The local-first app, API safeguards, admin operations,
retention jobs, and low-cost infrastructure are implemented. Public release is still blocked by
operator-supplied legal details and real-device/store testing; paid iOS remains deliberately
disabled.

| Target | Position now | Remaining gate |
| --- | --- | --- |
| Local UI and JavaScript development | Ready | None |
| Offline Android internal test | Code-ready | Install Android toolchain and run native/device QA |
| Closed free Android beta | Nearly ready | Final package identity, privacy details, Play forms, device matrix |
| Paid Android beta | Safeguards implemented | Deploy cloud, connect RTDN, run license/refund/restore tests |
| Public Android release | Not signed off | Complete every manual release-checklist item |
| Paid iOS | Disabled | Implement StoreKit server verification and Apple lifecycle handling |

## Implemented from the original review

### Paid-launch safety

- Support and purchase mutation routes enforce server-side feature flags and return
  `feature_disabled`; the per-instance emergency cache is 30 seconds.
- Google Play purchase tokens and order IDs are SHA-256 hashed and atomically bound to one owner.
- Repeat verification by the same owner is idempotent. Cross-owner claims are rejected unless the
  user explicitly invokes Restore, which atomically transfers the single entitlement.
- Verification success, duplicate, conflict, transfer, pending, rejection, and failure paths are
  audited without storing raw purchase tokens.
- Verification uses Google's current ProductPurchaseV2 state and line-item response. Pending and
  cancelled one-time purchases do not grant premium.
- Google Play Real-time Developer Notifications are accepted through an OIDC-authenticated Pub/Sub
  push route, deduplicated by message ID, re-verified with Google, and reconciled.
- Voided purchase notifications revoke the bound entitlement.
- Terraform creates the RTDN topic, authenticated push subscription, least-purpose internal
  invoker, and nightly maintenance job. Connecting the generated topic in Play Console is
  necessarily manual.
- The iOS paywall and purchase service refuse paid unlock because no App Store server verifier
  exists yet.

### Mobile correctness and resilience

- Reminder times use a native system time picker and strict `00:00`–`23:59` validation.
- Habit reminders are occurrence-aware one-shot notifications for daily, weekday,
  times-per-week, interval, and anytime schedules.
- Notifications are recalculated after data, pause, completion, timezone, and configuration
  changes. Optional auto-quieting pauses a repeatedly ignored habit for three days.
- Capacity is a hard ceiling on recommended effort; available time is a second constraint.
- Recency uses real calendar-day differences.
- Pause history stores explicit start/end intervals, so future pauses no longer erase historical
  opportunities.
- Comebacks use distinct calendar dates.
- Active focus sessions are persisted immediately and restored after process death; pause time is
  persisted, notification failure is non-fatal, and early finish has a closure state.
- Focus also offers an optional launch countdown, transition capture, interruption parking, local
  body-double companion, and planned-versus-actual time feedback without grading.
- JSON restore uses a complete Zod schema, a 10 MB limit, reference checks, version migration,
  preview counts, destructive confirmation, and an automatic pre-restore safety copy.
- Database schema migrations are ordered and versioned. Native builds verify
  `PRAGMA cipher_version` and fail safely if SQLCipher is unavailable.
- The database materializes daily completion summaries and keeps only recent history plus the two
  latest records per habit in application memory; full raw history remains available for export.
- Users can export both the complete JSON backup and a formula-safe portable CSV.
- A React error boundary, privacy-safe local diagnostic ring buffer, export, and clear operation
  are implemented.

### ADHD and cognitive-load experience

- Habit creation starts with a short Basics section and editable starter templates; detailed
  variants, schedule, context, priority, and reminders live in optional Fine-tuning.
- Onboarding can create one personal first Spark.
- Calm, balanced, and celebratory sensory profiles control motion and feedback.
- Points and rhythm percentages can be hidden.
- Minimum viable day shows exactly one tiny action. Today also exposes a direct
  **Rescue my day** control.
- Today shows no more than three recommendations and can prioritize the current context: home,
  work, outside, or phone.
- Every recommendation includes one short explanation.
- Journey includes a gentle seven-day reflection based only on wins and useful tiny steps.
- The Android widget rotates supportive wording without changing the underlying commitment.
- Social feeds, leaderboards, random rewards, loss-framed streak protection, and engagement
  notifications remain intentionally excluded.

### Admin and cloud operations

- Users, support, messages, promo inventory, and audits use bounded cursor pagination.
- User search is indexed and exact by UID or normalized email.
- Destructive grants, revocations, role changes, promo imports, support resolution, and global
  configuration changes require confirmation.
- The owner-only audit viewer filters by actor, action, or target.
- Nonexistent support threads return `404`.
- Support records, audit records, and RTDN deduplication records carry deletion timestamps and are
  purged by an authenticated scheduled job.
- Cloud-account deletion removes support and entitlement data, deletes the Firebase identity, and
  replaces that identity in retained purchase, promotion, message-author, and audit records with
  an unlinkable deletion pseudonym.
- Cloud Run emits structured request/error logs with request IDs.
- `/healthz` and Firestore-backed `/readyz` endpoints are implemented.
- Terraform offers an opt-in five-minute synthetic readiness check and 5xx alert. It is disabled by
  default so an unused scale-to-zero service is not woken and billed.
- A safe Firebase Emulator Suite mode uses the `demo-spark-local` project, localhost-only guards,
  deterministic Auth/Firestore seed data, and a local admin account.
- The admin dashboard supports support conversations, grants, promo codes, configuration, roles,
  cursor pagination, and audit review without access to offline habit data.

### Automated quality gates

- Domain tests cover capacity, recency, pause history, and distinct-day comebacks.
- Mobile tests cover notification occurrence planning, malformed/legacy/future backups,
  accessible settings, and core components.
- API tests cover feature shutdowns, purchase idempotency/conflicts/transfers, authenticated RTDN,
  event deduplication, revocation, privacy, and missing support records.
- The single authoritative Maestro flow covers onboarding, habit creation, tiny completion,
  reward, capture, focus closure, and process-restart persistence.
- Root test scripts rebuild shared runtime packages first, preventing stale generated code from
  producing misleading integration results.

## Validation completed in this environment

- `npm.cmd run typecheck` — passed for all workspaces.
- `npm.cmd run test:ci` — **38 tests passed**: 13 mobile, 8 domain, 16 API, 1 admin.
- `npm.cmd run build` — admin production build, Android JavaScript export, shared packages, and API
  build passed.
- Expo Doctor — passed after aligning `@types/jest` to the Expo SDK recommendation.
- Terraform — `fmt` and `validate` passed with a temporary checksum-verified official binary.
- JSON configuration parsing and the release file inventory passed.
- `npm audit --omit=dev` reports the upstream moderate `uuid` advisory documented in
  [security.md](security.md). No compatible fix is currently published; a forced major override
  was not applied.

Not run here:

- native Gradle build, Maestro, TalkBack, widget, or physical-device QA because Java/Android SDK
  and `adb` are not installed;
- a project-specific Terraform `plan` or `apply`, because no operator project was selected;
- Google Play purchase/refund testing because it requires the operator's Play application and
  license testers.

## Remaining manual release gates

These cannot be safely guessed or automated:

1. Decide whether `com.sparkhabits.app` is the permanent Play package ID. If not, rename the Expo
   and native Android packages before the first upload.
2. Replace every `REPLACE_ME` value with the real legal operator, contact, address, retention
   decisions, and privacy email.
3. Publish the privacy policy at a stable public HTTPS URL and put that URL in the app and Play
   Console.
4. Complete Data safety, Health apps, content rating, target audience, app access, and other Play
   declarations from the exact release build.
5. Install Android Studio/SDK/Java and run the device, accessibility, timezone/DST, backup,
   low-memory, process-death, notification, and widget matrix.
6. Run the authoritative Maestro flow on the signed or release-like Android build.
7. If cloud is enabled, install Terraform, run `init`, `validate`, and a project-specific `plan`,
   then review the plan before applying it to a dedicated project.
8. Grant the Cloud Run identity least-privilege Google Play access and paste Terraform's
   `google_play_rtdn_topic` output into Play Console.
9. Test new, pending, cancelled, already-owned, restored, refunded, revoked, promo, and manual-grant
   purchase paths from a Play internal test installation.
10. Confirm the operator who will watch support, Play policy mail, billing alerts, refunds, and
    incident controls.

The exact go/no-go list is [release-checklist.md](release-checklist.md).

## Cost judgment

The offline application still costs **USD 0/month** in cloud runtime. Optional cloud resources keep
Cloud Run at `min=0`, cap it at two instances, use bounded queries, retain no habit history, clean
old images, and schedule only one inexpensive nightly retention request. Synthetic monitoring is
off by default because periodic probes wake a scale-to-zero service. Small beta use should
typically fit no-cost quotas, but budgets are alerts rather than hard caps; see
[08-cost-controls.md](08-cost-controls.md).

## Product indicators worth collecting

Only after a disclosure/consent decision, collect privacy-minimal aggregate events such as backup
success, purchase lifecycle success, crash-free sessions, reminder disable/quiet rates, and
optional qualitative reports of pressure or usefulness. Do not optimize for time in app, raw daily
opens, longest streak, or notification taps. Spark succeeds when a short interaction helps someone
begin a real-world action.
