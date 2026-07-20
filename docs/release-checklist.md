# Release checklist

Use this file as staged gates, not as one giant first-day task list. Start with **Gate 1**. The
long evidence checklist afterward is for final release confidence and records device checks that
automation cannot prove.

The beginner, field-by-field instructions and examples are in the
[Android and Google Play release guide](./03-android-release.md). If a term or checkbox below is
unclear, follow its corresponding numbered section there.

The upload-ready graphics, listing text, screenshot descriptions, and recommended form answers
are grouped in the [Google Play submission pack](../store/android/README.md).

## Gate 1 — before the first Internal testing upload

These are the only immediate steps for getting a Play-delivered build onto your own/tester
devices:

- [x] Permanent package ID confirmed and renamed to `com.djpokis.sparkhabits.app` before any
      Play upload; see [release guide section 1](./03-android-release.md#1-decide-the-permanent-package-id).
- [x] Confirm Expo config, `spark.ps1`, and Maestro flow use that same ID. If the ignored/generated
      native Android folder exists, regenerate it and confirm its Gradle ID too. Do not upload
      until this is true; the first artifact fixes the Play identity.
- [x] Keep cloud, remote config, purchases, and creator-tip flags off for the initial offline build.
- [x] Replace the privacy-policy placeholders and choose retention periods. This is recommended
      before any external testing and is required by Spark's release check. Play Internal testing
      itself can be started before every listing/form is complete.
- [x] Run `.\spark.cmd check -Level Release` and understand every warning.
- [ ] Test a native release-like APK on a real Android device; Expo Go is not sufficient.
- [ ] Create and back up the local upload key once with
      `.\spark.cmd release -Action LocalSetup`. Store both
      `apps/mobile/credentials/spark-upload.p12` and its unique 20+ character password in
      LastPass; the password is not stored by the repository.
- [ ] Create the production `.aab` locally with
      `.\spark.cmd release -Action LocalBuild`. Confirm it reports package
      `com.djpokis.sparkhabits.app`, the intended version/code, a production certificate, and a
      SHA-256 hash. The result is under `artifacts/release`; this uses no EAS hosted build.
- [ ] In Play Console create a **Free / App** entry, enable Play App Signing, and upload only to
      **Testing → Internal testing**.
- [ ] Add tester Google accounts, open the opt-in link with an allowed account, and install the
      Play-delivered build.
- [ ] Verify onboarding, local storage, notifications, widgets, backup/restore, offline mode, and
      upgrade behavior in that Play-installed build.

Store graphics, the full listing, and most policy declarations do not have to block the first
Internal upload. Prepare them during Gate 2; never use that flexibility to skip them before wider
distribution.

## Gate 2 — before Closed testing

- [x] Publish `apps/admin/public/privacy.html` at a public HTTPS URL and verify it while logged out.
- [ ] Run `.\spark.cmd release -Action Assets` and review every item in
      `store/android/asset-manifest.md` against the final AAB.
- [ ] Complete the main store listing: accurate descriptions, 512×512 icon, 1024×500 feature
      graphic, current screenshots, support email, and website/privacy URL. Upload the prepared
      files from `store/android` rather than recreating them.
- [ ] Complete Data safety from the exact distributed binary and its enabled flags/SDK behavior.
- [ ] Complete the Health apps declaration after reviewing Spark's ADHD wording; do not guess that
      it has no health-related scope.
- [ ] Complete Ads, App access, Content rating, Target audience, and every other App content card
      shown by Play Console.
- [ ] Review Play's App bundle explorer permissions and resolve any unexpected sensitive
      permission.
- [ ] Run the applicable Product, Engineering, Accessibility, and Privacy checks below.
- [ ] Recruit representative testers and give them a clear feedback/support path that does not
      request private habit content.
- [ ] If Play says the developer account is subject to the personal-account production rule,
      maintain at least 12 opted-in Closed testers continuously for 14 days before applying for
      production access.

## Gate 3 — before Production

- [ ] All applicable items in the detailed evidence checklist below are complete or have an
      explicit, reviewed reason they do not apply.
- [ ] Closed-test feedback, crashes, ANRs, accessibility results, pre-launch report, target-device
      warnings, and Play policy notices have been reviewed.
- [ ] Store copy, privacy policy, Data safety, Health declaration, permissions, and current binary
      still agree after the last change.
- [ ] Version name and monotonically increasing version code are correct.
- [ ] A support owner, release artifact/commit record, rollback build, and feature-disable path are
      known.
- [ ] Premium/cloud sections below remain not applicable and disabled unless those features have
      passed their own test lifecycle.

## Complete release evidence checklist

You can leave **Monetization** and **Cloud cost and security** unchecked for the initial offline
release. They become mandatory only when those optional features are enabled.

## Product

- [ ] First-run onboarding tested by someone unfamiliar with the project
- [ ] Tiny/standard/stretch labels are compassionate and concrete
- [ ] No punitive streak reset, failure-red, paid repair, or random-reward behavior; optional
      streak gaps keep the personal best and streak saves never create fake completions/points
- [ ] Core features work in airplane mode
- [ ] Empty states and error states are understandable

## Engineering

`.\spark.cmd release -Action Verify` runs the five automated commands below in order. They remain
listed separately so release evidence can identify exactly which check failed.

- [x] `npm.cmd run doctor`
- [x] `npm.cmd run typecheck`
- [x] `npm.cmd run test:ci`
- [x] `npm.cmd run build`
- [x] `npm.cmd run release:check`
- [ ] Release-like Android build tested
- [ ] Backup/restore tested on a clean install
- [ ] Schema 1/2/3 backups migrate to schema 4; schema-4 weekly/leave-on-time/one-week-change data restores
- [ ] Password-encrypted backup rejects wrong keys and modified ciphertext before replacing data
- [ ] Automatic folder backup permission survives restart and retains no more than seven files
- [ ] Recovery code is copied somewhere private; old-code behavior after rotation is understood
- [ ] Database encryption checked in a native build
- [ ] Today, Habit Calendar, Quick Capture, Focus, Routine, Progress, and Toolkit widgets checked on three launchers
- [ ] Widget tap behavior is explicit and cannot create a surprising completion
- [ ] Quick Capture widget parks only after explicit submission
- [ ] Focus widget pause/resume and force-stop recovery use the same persisted timer
- [ ] Progress widget matches local totals and Toolkit’s four destinations open without writes
- [ ] Habit Calendar widget fits two six-week habit grids, refreshes local completions, and opens Calendar without writing
- [ ] Routine widget shows the current persisted step, paused state, empty state, and opens without changing data
- [ ] Settings/Calendar sections and fixed-width add controls checked at 200% text
- [ ] All tutorials can be skipped, dismissed, replayed, and restored; first-use prompt dismisses
- [ ] Back behavior checked from normal navigation, widget launches, and cold deep links
- [ ] Four launcher shortcuts open the correct narrow routes and expose no user content
- [ ] Android Share to Spark receives text/URLs locally
- [ ] Rapid repeated taps do not create duplicate completions
- [ ] Exact/window reminders, custom snooze, tiny-version completion, and Quiet today tested
- [ ] Daily and every-other-day streaks tested across a completed window, blank closed window,
      streak save, planned break, pause, schedule change, backup/restore, and device restart
- [ ] Routine pause/step/tiny/skipped state survives force-stop and restart
- [ ] Habit, routine, focus, and Capture drafts survive process death
- [ ] Offline soundscapes stop outside active Focus and no microphone permission appears
- [ ] Quiet now disables sound, haptics, motion, celebrations, reward overlay, and same-day reminder vibration
- [ ] App lock tested with biometric and device credential; unavailable authentication cannot lock the user out
- [ ] Sensitive app preview/screenshot behavior tested on Android; iOS app-switcher behavior tested before iPhone release
- [ ] Full/private/secret notification lock-screen visibility tested
- [ ] Calendar export opens one create-event dialog without requesting/listing calendar data
- [ ] Generated manifest contains calendar permissions only as `tools:node="remove"`
- [ ] Merged release manifest contains no `READ_MEDIA_IMAGES`, broad-storage, calendar, or overlay permission
- [ ] Generated/merged release manifest keeps `android:allowBackup="false"`
- [ ] Shared-progress PNG/text contains only explicitly selected completed actions
- [ ] One-week change starts/stops at its local date window and uses neutral comparison language
- [ ] Simple mode, Help me now, Weekly reset, friction fields, and Leave on time survive restart
- [ ] All 19 language choices open; Lithuanian and Arabic/RTL device QA completed
- [ ] Privacy-safe diagnostics manually inspected for content/path/URI redaction
- [ ] Packaged Baseline Profile exists; startup/ANR results reviewed in Play pre-launch and vitals
- [ ] Android target API re-checked
- [ ] Version and versionCode updated

## Accessibility

- [ ] TalkBack
- [ ] large text
- [ ] reduced motion
- [ ] contrast
- [ ] touch targets
- [ ] no color-only meaning
- [ ] app-lock gate and progress-card checkboxes have correct TalkBack semantics
- [ ] widgets and shortcuts have understandable accessible labels
- [ ] admin keyboard navigation

## Privacy and policy

- [x] Public operator identity, address, contact, and approved retention periods synchronized
- [x] Host public non-geofenced HTML privacy policy
- [ ] Settings → Privacy opens and its plain-language text matches the hosted policy
- [ ] Data safety form matches released SDK behavior
- [ ] Health apps declaration completed accurately
- [ ] Medical disclaimer visible
- [ ] Developer account type accepted for Spark's classification
- [ ] Cloud deletion tested
- [x] Retention periods approved
- [ ] Creator-tip build flag is `false`, or external-payment program/region/reporting eligibility is documented for this exact binary

## Google Play

- [x] Package ID final: `com.djpokis.sparkhabits.app`
- [ ] Play App Signing enabled
- [ ] First bundle accepted manually before relying on Publishing API automation
- [ ] If `LocalPublish` is used: `PlayStatus` succeeds with an app-only service account
- [ ] Publisher key and upload key/password backed up separately in LastPass
- [ ] Testing publisher has only View app information and Release apps to testing tracks
- [ ] Latest build/publish JSON reviewed and retained with the release evidence
- [ ] Store listing and screenshots
- [ ] feature graphic and icon
- [ ] contact email and website
- [ ] content rating
- [ ] target audience
- [ ] internal test complete
- [ ] closed-test feedback reviewed

## Monetization

- [ ] Control plane deployed before purchase is enabled
- [ ] Publisher service-account permission is least privilege
- [ ] product active in every intended country
- [ ] license-tester purchase passes
- [ ] restore passes
- [ ] official promo code passes
- [ ] manual grant/revoke passes
- [ ] if purchases will launch, Terraform RTDN flag is enabled and its topic/subscription is connected in Play Console
- [ ] authenticated RTDN purchase/refund/revocation tests pass
- [ ] purchase terms and support process published

## Cloud cost and security

- [ ] [costed-feature register](./08-cost-controls.md) reviewed against current official pricing
- [ ] every unused app-config cost switch remains off
- [ ] `enable_cloud_runtime` was intentionally enabled only if cloud is required
- [ ] mobile remote-config flag is false for offline builds
- [ ] admin dashboard build flag is false unless the dashboard is intentionally deployed
- [ ] dedicated project and intended Firestore region
- [ ] Cloud Run min 0/max 2
- [ ] USD 5 or chosen budget alert
- [ ] service quotas reviewed
- [ ] deny-all Firestore client rules deployed
- [ ] first owner custom claim set; bootstrap allowlist removed
- [ ] CORS contains only real dashboard origins
- [ ] no service-account key files
- [ ] Artifact Registry cleanup active
- [ ] if support/audits are retained, nightly retention flag is enabled and the job succeeded
- [ ] synthetic monitoring decision recorded; if enabled, alert email verified
- [ ] support rate limit manually tested
- [ ] cross-user and cross-role tests pass

## Rollout

- [ ] start internal
- [ ] then closed
- [ ] first production release approved after test-track sign-off
- [ ] staged rollout configured for later production updates
- [ ] named person monitors support and Play policy mail
- [ ] rollback build and feature-disable procedure known
- [ ] API feature-disable propagation tested (allow up to 30 seconds)
