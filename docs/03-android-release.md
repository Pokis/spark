# Android release

Spark is configured for Android first. The current application ID is
`com.sparkhabits.app`.

The generated Expo SDK 57 Android project targets API 35, meeting the current Play requirement.
Re-check the live requirement before every release because Google raises it over time.

## Important before the first Play upload

The application ID becomes effectively permanent after publishing. If you own a domain, consider
changing it to a reverse-domain ID you control before the first upload. Update:

- `apps/mobile/app.config.ts`
- `.env.example`
- `apps/mobile/.env.example`
- `services/control-plane/.env.example`
- `infra/terraform/terraform.tfvars.example`
- `infra/terraform/terraform.tfvars`
- the Google Play package name used by the control plane

Do not change it after purchases exist.

## 1. Run release checks

```powershell
npm.cmd run typecheck
npm.cmd run test:ci
npm.cmd run release:check
```

Test a native release-like build because Expo Go does not contain SQLCipher, the widget, or Play
Billing:

```powershell
Set-Location apps/mobile
npx.cmd expo run:android --variant release
Set-Location ..\..
```

## 2. Build an Android App Bundle

The simplest path for a mobile-development beginner is EAS Build:

```powershell
Set-Location apps/mobile
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest init
npx.cmd eas-cli@latest build --platform android --profile production
Set-Location ..\..
```

EAS can create and securely manage the Android upload key. Save an independent copy of any
credentials EAS lets you download. Google Play App Signing should manage the final app-signing
key.

The result is an `.aab`, which is the format Google Play expects.

## 3. Create the Play Console app

In Google Play Console:

1. Create an app named **Spark**.
2. Select the appropriate app/game and free/paid declarations.
3. Complete the store listing, contact details, and content rating.
4. Upload the `.aab` to **Internal testing** first.
5. Add tester email addresses or a Google Group.
6. Install through the Play test link. Billing cannot be tested reliably from a sideloaded debug
   build.

## 4. Policy forms

Complete every Play Console **App content** form. At minimum:

- privacy policy: deploy `apps/admin/public/privacy.html` and replace its email first
- Data safety: local habit data stays on-device; support/purchase data is optional
- ads: Spark includes no ads
- app access: explain admin sign-in only if Google reviews the separate dashboard
- target audience
- content rating
- Health apps declaration

All apps on closed, open, or production tracks must complete the Health apps declaration;
internal-testing-only apps are currently exempt. Because Spark is explicitly positioned for
ADHD-related executive functioning, obtain a policy decision before release about whether to
declare **Stress Management, Relaxation, Mental Acuity** or another relevant health feature. Do
not simply declare “no health features” without reviewing the current implementation and store
wording.

Google's current health policy requires a public, non-geofenced HTML privacy policy and clear
disclaimers. Spark includes both. It makes no diagnosis or treatment claim.

### Developer account caveat

Google Play may require an Organization developer account for apps treated as health apps.
Organization verification requires legal information and normally a D-U-N-S number. Since you
already have a developer account, check its account type and ask Play Console support **before**
building a launch campaign. If the account is personal and Google classifies Spark as a health
app, an account update or formal transfer may be required.

Useful live references:

- [Target API requirement](https://developer.android.com/google/play/requirements/target-sdk)
- [Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291)
- [Health content and services policy](https://support.google.com/googleplay/android-developer/answer/16679511)
- [Play Console account requirements](https://support.google.com/googleplay/android-developer/answer/10788890)

## 5. Configure the one-time product

Do this only after the control plane is deployed:

1. Create a one-time product with ID `spark_premium_lifetime`.
2. Add and activate its purchase option and regional prices.
3. Link the control-plane service account to Play Console API access.
4. Give it only the permission needed to view orders/subscriptions and manage purchase
   acknowledgement.
5. Add license testers.
6. Set `purchasesEnabled` in the admin dashboard only after a test purchase verifies.

Do not finish a transaction before the control plane confirms it. The mobile adapter follows this
order.

## 6. Promo codes

Generate official one-time-product promo codes in Play Console. Import them into the Spark admin
dashboard, then assign one to a cloud identity. Google limits how many codes can be created in a
period; check the live Play Console limit before planning a campaign.

## 7. Promote gradually

Recommended tracks:

1. Internal testing: owner and devices you control.
2. Closed testing: accessibility and ADHD-experience testers.
3. Open testing only if support capacity is ready.
4. First production release after test-track sign-off. Google Play staged rollouts are for updates,
   not the initial production release.
5. Later production updates with staged rollout: 5%, 20%, 50%, 100%.

Watch crashes, policy notices, support volume, notification complaints, backup behavior, and Play
purchase acknowledgement before each increase.

## Versioning

For every store upload, increment:

- `version` in `apps/mobile/package.json`
- `version` in `apps/mobile/app.config.ts`
- Android `versionCode`

EAS production builds are configured to auto-increment the native build number, but the public
semantic version still needs an intentional change.
