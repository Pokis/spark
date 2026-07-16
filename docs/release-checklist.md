# Release checklist

## Product

- [ ] First-run onboarding tested by someone unfamiliar with the project
- [ ] Tiny/standard/stretch labels are compassionate and concrete
- [ ] No streak-reset, failure-red, or random-reward behavior
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
- [ ] Database encryption checked in a native build
- [ ] Widget checked on three launchers
- [ ] Android target API re-checked
- [ ] Version and versionCode updated

## Accessibility

- [ ] TalkBack
- [ ] large text
- [ ] reduced motion
- [ ] contrast
- [ ] touch targets
- [ ] no color-only meaning
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
- [ ] Terraform RTDN topic/subscription deployed and connected in Play Console
- [ ] authenticated RTDN purchase/refund/revocation tests pass
- [ ] purchase terms and support process published

## Cloud cost and security

- [ ] dedicated project and intended Firestore region
- [ ] Cloud Run min 0/max 2
- [ ] USD 5 or chosen budget alert
- [ ] service quotas reviewed
- [ ] deny-all Firestore client rules deployed
- [ ] first owner custom claim set; bootstrap allowlist removed
- [ ] CORS contains only real dashboard origins
- [ ] no service-account key files
- [ ] Artifact Registry cleanup active
- [ ] nightly retention job succeeded
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
