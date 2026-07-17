# Release checklist

## Product

- [ ] First-run onboarding tested by someone unfamiliar with the project
- [ ] Tiny/standard/stretch labels are compassionate and concrete
- [ ] No punitive streak reset, failure-red, paid repair, or random-reward behavior; optional
      Momentum gaps keep the personal best and protections never create fake wins/points
- [ ] Core features work in airplane mode
- [ ] Empty states and error states are understandable

## Engineering

- [ ] `npm.cmd run doctor`
- [ ] `npm.cmd run typecheck`
- [ ] `npm.cmd run test:ci`
- [ ] `npm.cmd run build`
- [ ] `npm.cmd run release:check`
- [ ] Release-like Android build tested
- [ ] Backup/restore tested on a clean install
- [ ] Schema 1/2/3 backups migrate to schema 4; schema-4 weekly/departure/experiment data restores
- [ ] Password-encrypted backup rejects wrong keys and modified ciphertext before replacing data
- [ ] Automatic folder backup permission survives restart and retains no more than seven files
- [ ] Recovery code is copied somewhere private; old-code behavior after rotation is understood
- [ ] Database encryption checked in a native build
- [ ] Today, Quick Capture, Focus, Progress, and Toolkit widgets checked on three launchers
- [ ] Widget tap behavior is explicit and cannot create a surprising completion
- [ ] Quick Capture widget parks only after explicit submission
- [ ] Focus widget pause/resume and force-stop recovery use the same persisted timer
- [ ] Progress widget matches local totals and Toolkit’s four destinations open without writes
- [ ] Settings/Progress collapsible sections and fixed-width add controls checked at 200% text
- [ ] All tutorials can be skipped, dismissed, replayed, and restored; first-use prompt dismisses
- [ ] Back behavior checked from normal navigation, widget launches, and cold deep links
- [ ] Four launcher shortcuts open the correct narrow routes and expose no user content
- [ ] Android Share to Spark receives text/URLs locally
- [ ] Rapid repeated taps do not create duplicate completions
- [ ] Exact/window reminders, custom snooze, Log tiny, and Quiet today tested
- [ ] Daily and every-other-day Momentum tested across a completed window, blank closed window,
      Flex restoration, planned delay, pause, cadence change, backup/restore, and device restart
- [ ] Routine pause/step/tiny/skipped state survives force-stop and restart
- [ ] Habit, routine, focus, and Capture drafts survive process death
- [ ] Offline soundscapes stop outside active Focus and no microphone permission appears
- [ ] Quiet now disables sound, haptics, motion, celebrations, reward overlay, and same-day reminder vibration
- [ ] App lock tested with biometric and device credential; unavailable authentication cannot lock the user out
- [ ] Sensitive app preview/screenshot behavior tested on Android; iOS app-switcher behavior tested before iPhone release
- [ ] Full/private/secret notification lock-screen visibility tested
- [ ] Calendar export opens one create-event dialog without requesting/listing calendar data
- [ ] Generated manifest contains calendar permissions only as `tools:node="remove"`
- [ ] Selected-win PNG/text contains only explicitly checked wins
- [ ] Personal experiment starts/stops at its local date window and uses neutral comparison language
- [ ] Simple mode, Help me now, Weekly reset, friction fields, and Departure mode survive restart
- [ ] All 15 language choices open; Lithuanian and Arabic/RTL device QA completed
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

- [ ] Replace every `REPLACE_ME`
- [ ] Host public non-geofenced HTML privacy policy
- [ ] In-app Privacy link works
- [ ] Data safety form matches released SDK behavior
- [ ] Health apps declaration completed accurately
- [ ] Medical disclaimer visible
- [ ] Developer account type accepted for Spark's classification
- [ ] Cloud deletion tested
- [ ] Retention periods approved

## Google Play

- [ ] Package ID final
- [ ] Play App Signing enabled
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
