# Android and Google Play release guide

This is the beginner path from the working Spark project to Google Play. It explains what each
store item means, what already exists, what you must provide yourself, and which cloud/payment
steps can wait.

Policy and console details were reviewed on **July 17, 2026**. Google changes Play Console and
its policies, so use the linked official pages to confirm any screen that no longer matches this
guide.

## Short version: get the first Internal test into Google Play

**TL;DR:** follow the table from top to bottom. The package ID, publisher details, retention,
audience, and store positioning are confirmed. The remaining account task is publishing the
prepared privacy page and creating the signed Play bundle.

Start here. All PowerShell commands below are run in **PowerShell at `D:\AI\Spark`** unless a row
says otherwise. Do not start Google Cloud, Firebase, Premium, or the admin dashboard for this
first release.

| Step | Who/where | Exact action | Done when |
| --- | --- | --- | --- |
| 1. Permanent ID | **Done locally** | `com.djpokis.sparkhabits.app` was selected and propagated before any Play upload. Do not change it after upload. | `Inspect` reports the same ID in Expo, helpers, Maestro, and generated Android. |
| 2. Publisher details | **Done locally; you review** | Domantas Judeikis, the supplied Vilnius address, Lithuania, `djpokis@gmail.com`, and the approved retention defaults are synchronized in both policy files. | `rg -n "REPLACE_ME" docs/privacy-policy.md apps/admin/public/privacy.html` prints nothing. |
| 3. Publish the privacy page | **Done July 17, 2026** | Static Firebase Hosting only; no database or server runtime was enabled. | `https://djpokis-spark-habits.web.app/privacy.html` returned HTTP 200 without login and contained the approved operator details. |
| 4. Run the release gate | **Codex or you**, PowerShell at `D:\AI\Spark` | Run `.\spark.cmd release -Action Verify`. | The command exits successfully. Decision reminders may remain; red failures may not. |
| 5. Test native Android | **You**, connected phone plus PowerShell | Run `.\spark.cmd devices`, copy the printed model/ID, then run `.\spark.cmd release -Action Native -Device "THE_PRINTED_VALUE"` and complete the physical-device checklist. | Onboarding, widgets, reminders, backup, app lock, calendar handoff, and airplane mode pass. |
| 6. Build the Play bundle | **EAS link done; build remains**, PowerShell | Run `.\spark.cmd release -Action Project` to confirm the existing link, then `.\spark.cmd release -Action Build -Profile production -Message "First internal test"`. | EAS reports a successful Android `.aab` build. |
| 7. Download one exact bundle | **You**, PowerShell | Run `.\spark.cmd release -Action List -Profile production`, copy its build ID, then run `.\spark.cmd release -Action Download -BuildId THE_ID`. | One `.aab` exists under `artifacts\eas`. |
| 8. Create the Play app | **You**, [Play Console](https://play.google.com/console/) | **Home → Create app**; use name `Spark`, type `App`, price `Free`, your default listing language, and a monitored support email. | Spark's Play Console dashboard opens. |
| 9. Upload to Internal | **You**, Play Console | Open **Test and release → Internal testing** (or search the left menu for **Internal testing**), add your tester account, create a release, and upload the exact `.aab`. | Play gives you an Internal-test opt-in link. |
| 10. Install from Play | **You**, Android phone | Open the opt-in link with the tester Google account and install Spark from Google Play. | The Play-installed build passes section 11. |
| 11. Prepare wider release | **You**, PowerShell then Play Console | Run `.\spark.cmd release -Action Assets`, open `store/android/README.md`, upload the named files, paste the listing, and follow its declaration worksheet. Then run the required Closed test if your dashboard asks for it. | The local asset check passes, Play shows no blocking setup tasks, and the console allows a production-access/release action. |

### Current local status—already checked by Codex

**TL;DR:** code, tests, Android tooling, identity, privacy text, graphics, and AAB configuration
are ready locally. Firebase Hosting and EAS project linking are complete. EAS signing/build,
physical-device sign-off, Play upload, and console attestations remain.

The commands `.\spark.cmd release -Action Inspect`, `.\spark.cmd release`, and the complete
`.\spark.cmd release -Action Verify` were run on **July 17, 2026**. Re-run `Inspect` whenever you
want a fresh status. Doctor, TypeScript, 258 tests, coverage, production builds, identity,
privacy, listing, and graphics checks form the local release gate.

| Item | Current result |
| --- | --- |
| Package ID consistency | Confirmed: Expo, PowerShell helpers, Maestro, cloud templates, tests, and regenerated Android use `com.djpokis.sparkhabits.app`. |
| Version | Ready: public/mobile/native version `0.1.0`; native version code `1`. |
| Bundle configuration | Ready: EAS production output is an Android App Bundle and the default submit track is Internal. |
| Automated verification | Doctor, all workspace types, 258 tests, coverage, builds, identity, listing limits, and graphics checks are automated. |
| Local Android release build | `assembleRelease` passed July 17, 2026; the APK reports package `com.djpokis.sparkhabits.app`, version `0.1.0` / code `1`, target API 36, and no forbidden calendar/media/storage/overlay/camera/microphone/location permission. Physical-device sign-off remains. |
| First-build cloud boundary | Ready locally: API blank, remote config off, creator-tip link off. Re-check the separate EAS environment before building. |
| Privacy policy | Filled consistently and live at `https://djpokis-spark-habits.web.app/privacy.html`; HTTP 200 and approved operator details verified July 17, 2026. |
| EAS link | **Ready:** `@djpokis-team/spark-adhd-habits`, project ID `d13c96e7-3533-4fdb-88da-48e0b5a4f932`; no hosted build has been started. |
| Store assets | **Ready:** six real-app screenshots, icon, feature graphic, listings for all 19 bundled languages, alt text, and an upload manifest are in `store/android`. |
| Play forms/testing | **Prepared but manual:** recommended answers are in `store/android/declarations.md`; your account, legal attestations, final policy URL, and tester actions cannot be automated. |

If you only want the next action, run `.\spark.cmd release -Action Verify`, then complete the
physical-device checks and create the production EAS build. The signed AAB and Play upload still
require deliberate authenticated actions.

## The recommended first release

> **TL;DR — decision:** release a free, offline `.aab` to **Internal testing** first. **Where:**
> repository configuration plus Play Console. **Do now:** keep every cloud/purchase flag off.
> **Done when:** the Play-installed Internal build works without an account or network.

Start with a **free, offline build on the Internal testing track**.

### Cost of this release path

**TL;DR:** Spark cloud runtime is `$0` while the documented flags are off. Before starting an EAS
build or Firebase Hosting deploy, read the price/quota screen; those services can charge based on
build or hosting usage, not Spark user count.

| Item | Initial recommendation | Cost behavior |
| --- | --- | --- |
| Spark app runtime | All cloud features off | **$0 Spark cloud runtime** for 1, 10,000, or 1,000,000 users; Google Play distributes the app and data stays on devices. |
| Google Play developer account | Use the account you already own | No new Spark per-upload or per-user server cost; your existing developer registration is the prerequisite. |
| EAS hosted build | Use the available free quota first | Build-service usage depends on build frequency, not user count. It can be $0 within Expo's current allowance; review the price shown before choosing a paid plan or priority build. |
| Privacy-policy hosting | Existing public site or minimal Firebase Hosting | Normally $0 for a tiny static page within provider allowances; traffic beyond allowance follows that provider's pricing. This does not require Cloud Run or Firestore. |
| Premium/admin/support | Do not enable for the first release | $0 while disabled. Their user-scale estimates and switches are in the [cost register](./08-cost-controls.md). |

These are infrastructure/runtime estimates, not tax, legal-review, design, or paid-marketing costs.
The selected Firebase project was checked on July 17, 2026: Cloud Billing was disabled and no
billing account was attached. A future feature that requires the Blaze plan must not silently
change that setting; review the cost register and explicitly approve billing first.

For that first upload you do **not** need:

- Google Cloud, Firebase, Cloud Run, Firestore, or Terraform;
- the Spark admin dashboard;
- a Play Billing product;
- a service-account key;
- purchase notifications or Real-time Developer Notifications (RTDN); or
- the Buy Me a Coffee link. Keep `EXPO_PUBLIC_SPARK_CREATOR_TIP_LINK_ENABLED=false` in a Play
  build.

You need **before the first Internal artifact upload**:

- a final Android package ID;
- a production Android App Bundle (`.aab`);
- a Play Console app configured as a free app;
- Play App Signing and at least one Internal tester; and
- a native test before uploading the bundle.

You need **before Closed/Open/Production distribution**:

- a real operator/contact identity and public privacy policy;
- the prepared app name, descriptions, icon, feature graphic, and screenshots from `store/android`;
- honest Play Console declarations; and
- actual testing through Google Play before public production.

The shortest order is:

1. Keep the confirmed `com.djpokis.sparkhabits.app` identity unchanged.
2. Publish the completed HTML privacy policy on the selected Firebase Hosting project.
3. Run Spark's release checks and native-device tests.
4. Use EAS Build to create a signed `.aab`.
5. Create the Play Console app and upload the `.aab` to **Internal testing**.
6. Run `.\spark.cmd release -Action Assets`, then use the exact upload map and policy worksheet in
   `store/android/README.md` to complete the listing and forms shown in Play Console.
7. Test the Play-installed build, then prepare a Closed test before production.

## Important terms that look similar

> **TL;DR — read once:** the only permanent identifier is the Android package ID. **Where to
> verify it:** run `.\spark.cmd release -Action Inspect`. The store name and version can change;
> `com.djpokis.sparkhabits.app` must not change after the first Play artifact upload.

| Term | Spark value/example | What it means | Can it change later? |
| --- | --- | --- | --- |
| Store app name | `Spark` | The public name users see in Google Play. | Yes. |
| Android package ID / application ID | `com.djpokis.sparkhabits.app` | The confirmed permanent technical identity inside the Android bundle and Play listing. | Do not change after the first uploaded artifact. |
| Expo slug | `spark-adhd-habits` | Expo's project-friendly name. It is not the Play package ID. | Possible, but avoid unnecessary changes after EAS setup. |
| EAS project ID | Generated by Expo | Connects this folder to an Expo project/build history. | Do not casually replace after setup. |
| Google Cloud project ID | Example: `spark-production-123` | Optional cloud infrastructure identifier. It is not the Play package ID. | The chosen project remains separate from the app identity. |
| Version name | `0.1.0` | Public version shown to people and support staff. | Yes; change intentionally for releases. |
| Version code | `1` | Android's always-increasing internal release number. | Must increase for every new Play upload. |
| APK | `app-release.apk` | Installable file useful for direct device testing. | Not the normal new-app Play upload. |
| AAB | `app-release.aab` | Bundle uploaded to Google Play; Play generates optimized APKs from it. | Build a new one for each release. |

Google states that package names are unique, permanent, and cannot be reused. The first artifact
uploaded even to Internal testing fixes the package name for that Play app. See
[Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152)
and [Set up a test](https://support.google.com/googleplay/android-developer/answer/9845334).

## 1. Permanent package ID — confirmed

> **TL;DR — done:** the operator selected `com.djpokis.sparkhabits.app` before any Play upload.
> Codex propagated it through source, tools, tests, cloud templates, and generated Android.
> **Verify:** `.\spark.cmd release -Action Inspect` shows the same ID everywhere.

The current ID is:

```text
com.djpokis.sparkhabits.app
```

This identifier is technically valid and was explicitly confirmed by the publisher. It is also
used as the future iPhone bundle identifier so the product identity remains consistent.

Do not put an email address, spaces, hyphens, display name, environment name, or secret in the
package ID. Use lowercase dot-separated identifier segments.

### Confirmed status

**TL;DR:** the one-time rename is complete. Continue to section 2; do not repeat the rename after
the first Play upload.

The package-related files and local native Android project must remain aligned. Spark's release
checker treats any disagreement as an error.

### If a different ID is ever requested before the first upload

**TL;DR:** stop here and ask Codex to perform the one-time rename. Do not upload any existing
Spark APK/AAB to Play, and do not hand-edit generated Android package folders.

Do this **before uploading any Spark APK or AAB to any Play track**. A new package ID creates a
separate Android app, so data from the existing development package will not automatically move
to it.

This repository generates a local native Android project and Android widgets. The folder is
intentionally excluded by `.gitignore`, so a package rename has two parts:

1. change the source configuration and project tools; and
2. regenerate any existing local Android folder so Kotlin/Java packages, widget receivers,
   manifest actions, and Gradle IDs used by local device tests all match.

Commit or back up source changes first. Native regeneration replaces `apps/mobile/android`; any
handwritten change that exists only inside that ignored folder would be lost. Spark's intended
native changes live in Expo config plugins and will be recreated.

### What each package-related file is for

**TL;DR:** edit source configuration, regenerate `apps/mobile/android`, then verify. The tables
below explain why; they are not a list of files you should change manually one by one.

#### Source and tools that must use the final ID

**TL;DR:** only change these source-controlled values if you change the permanent package ID;
`Inspect` currently confirms that all three already match.

| File | What is inside | Why it must match |
| --- | --- | --- |
| `apps/mobile/app.config.ts` | `const packageName = 'com.djpokis.sparkhabits.app'` | Primary Expo source for Android `package` and the future iPhone bundle identifier. |
| `spark.ps1` | `$script:PackageName` | Lets `spark.cmd stop` and other Android helpers address the correct installed app. |
| `apps/mobile/e2e/maestro/full-offline-flow.yaml` | `appId` | Tells the device-level test which app to launch. |

#### Generated local folder—do not edit ID occurrences one by one

**TL;DR:** never rename packages inside this ignored folder by hand. Regenerate it with the exact
prebuild command in **Safe rename sequence** after changing the source ID.

| Folder | What is inside | What to do after a rename |
| --- | --- | --- |
| `apps/mobile/android/` | Local Gradle namespace/application ID, generated Kotlin/Java packages, widget receivers/actions, and native version values. It is ignored by Git. | Regenerate it with Expo so local builds/tests match. EAS does not receive this ignored folder; it generates Android from `app.config.ts` and the configured plugins. |

#### Optional cloud templates or test fixtures that should remain consistent

**TL;DR:** these do not block the offline first release. Update them only during a package rename
so later Play verification cannot accidentally point at the former ID.

| File | Why it mentions the ID |
| --- | --- |
| `.env.example` | Consolidated example for the optional Play-verification service. |
| `services/control-plane/.env.example` | Default local API configuration used only when cloud/purchases are developed. |
| `services/control-plane/src/env.ts` | Development fallback for `GOOGLE_PLAY_PACKAGE_NAME`. Production should supply the value explicitly. |
| `services/control-plane/tests/app.test.ts` | Test fixtures for Play purchase verification. |
| `apps/mobile/src/data/database.integration.test.ts` | Android file-path test fixtures. |
| `infra/terraform/variables.tf` | Default package passed to the optional Cloud Run service. |
| `infra/terraform/terraform.tfvars.example` | Example operator configuration. |
| `infra/terraform/terraform.tfvars` | Your real local Terraform values, if this ignored file exists. It normally does not exist before cloud setup. |

The release checker reads the configured ID and requires every helper/generated identity to
match it; there is no unresolved package-name warning.

`apps/mobile/.env.example` does **not** currently contain the package ID and does not need a
package edit. `infra/terraform/main.tf` passes a variable and also does not need a literal rename.

### Safe rename sequence

**TL;DR:** have Codex apply the rename, then from `D:\AI\Spark` run
`.\spark.cmd check -Level Full` and `.\spark.cmd build -Scope Mobile`. Done means the old ID
appears only in explanatory documentation/release-warning logic.

From the repository root:

1. Change `packageName` in `apps/mobile/app.config.ts`.
2. Change `$script:PackageName` in `spark.ps1`.
3. Change `appId` in the Maestro flow.
4. Update the optional cloud defaults/fixtures in the table above so future purchase verification
   cannot target the wrong Play app. Leave the `scripts/release-check.mjs` comparison unchanged.
5. If `apps/mobile/android` exists, regenerate it from the Expo configuration:

```powershell
Set-Location apps/mobile
npx.cmd expo prebuild --platform android --clean
Set-Location ..\..
```

`--clean` deletes and recreates `apps/mobile/android`. Do not run it with uncommitted native work
you need to preserve. Spark's widgets, shortcuts, privacy permissions, SQLCipher configuration,
and performance plugin should be recreated by the configured Expo plugins; inspect the resulting
diff and rerun the tests.

6. If the generated folder exists, search it explicitly. It is ignored by normal
   whole-repository searches, but passing its path directly includes it:

```powershell
if (Test-Path apps/mobile/android) {
  rg -n "com\.sparkhabits\.app" apps/mobile/android
}
```

Then search the normal source tree:

```powershell
rg -n "com\.sparkhabits\.app" . --glob "!node_modules/**" --glob "!dist/**"
```

The native search should return nothing after regeneration. In the second search, documentation examples and the
release-check warning rule may intentionally retain the original ID; build, test, environment,
and service defaults should not.

7. Validate the result:

```powershell
.\spark.cmd check -Level Full
.\spark.cmd build -Scope Mobile
```

If you are unsure about the rename, stop before running `prebuild --clean` and ask Codex to make
and verify the one-time rename. There is no advantage to doing it manually under time pressure.

## 2. Release identity and privacy policy — filled

> **TL;DR — local work and hosting done. Where:** `docs/privacy-policy.md`,
> `apps/admin/public/privacy.html`. **Recorded:** Domantas Judeikis, the supplied Vilnius postal
> address, Lithuania, `djpokis@gmail.com`, and the approved retention schedule. **Live URL:**
> `https://djpokis-spark-habits.web.app/privacy.html`. **Remaining:** confirm the address/postal
> code is exactly how it should appear publicly.

Two policy files exist because they serve different purposes:

| File | Purpose | Is this the URL submitted to Play? |
| --- | --- | --- |
| `docs/privacy-policy.md` | Detailed editable source/reference for you and reviewers. | No; a repository Markdown file is not the public policy URL. |
| `apps/admin/public/privacy.html` | Public HTML page that can be deployed as a normal website. | Yes, after it is filled and hosted at a stable public HTTPS URL. |

The release checker requires both policy files to contain the completed values and remain
consistent. The approved starting schedule is 90 days after the latest support message, up to 180
days after promo reconciliation, 365 days for administrative security records, cloud identity
until deletion, and purchase records only as required for fraud, tax, accounting, or law.

Also update the effective date whenever the policy materially changes. The Markdown and hosted
HTML must describe the same released app. Do not promise that Spark has no cloud data if the
binary enables support or purchase verification.

Google requires a privacy policy for all published apps, including apps declaring no collection.
The URL must be public, active, non-geofenced HTML—not a PDF, login page, private Drive file, or
localhost address. It must identify the developer, explain accessed/collected/shared data,
security, retention/deletion, and a privacy contact. See the
[User Data privacy-policy requirements](https://support.google.com/googleplay/android-developer/answer/17105854)
and [Health content policy](https://support.google.com/googleplay/android-developer/answer/16679511).

### Hosting the policy with minimal cloud footprint

**TL;DR:** completed July 17, 2026 using Firebase project `djpokis-spark-habits`. The exact URL is
`https://djpokis-spark-habits.web.app/privacy.html`; it returned HTTP 200 without login. Only
Hosting was deployed—Firestore and Cloud Run remain disabled.

If you already have a public website, copy the finished HTML there. Otherwise Spark's existing
Firebase Hosting configuration can publish it without enabling Cloud Run, Firestore, support, or
purchases:

```powershell
.\spark.cmd deploy -Action Login -Provider Firebase
.\spark.cmd deploy -Action Hosting -ProjectId djpokis-spark-habits
```

The admin build copies `privacy.html` into `apps/admin/dist` alongside the static, signed-out
dashboard shell. With the admin/API feature configuration absent, that shell cannot perform
operator actions; Cloud Run and Firestore remain undeployed. If you do not want even that static
shell public, host the filled privacy HTML on an existing site instead. The helper runs the release
placeholder check and admin build, names the exact Firebase project, and requires you to type a
confirmation before it changes Hosting.

The expected URL is similar to:

```text
https://djpokis-spark-habits.web.app/privacy.html
```

Open that exact URL in a private/incognito browser window and on a phone. Confirm that it needs no
login and works outside your home network. Static hosting is normally tiny, but review
[the cost register](./08-cost-controls.md) and current Firebase pricing before deployment.

Use the final URL in Play Console's **Policy and programs → App content → Privacy policy**. Spark
also contains an in-app privacy explanation under Settings; ensure it still matches the hosted
policy.

## 3. Decide the exact first-build feature boundary

> **TL;DR — free/offline build. Where:** local `apps/mobile/.env.local` if present and the EAS
> production environment after EAS Setup. **Do:** leave the API/Firebase values blank and both
> feature switches `false`. **Verify local state:** `.\spark.cmd release -Action Inspect` says
> API blank/offline, remote config disabled, and creator tip disabled.

For the recommended free/offline test build:

```text
EXPO_PUBLIC_SPARK_API_URL=
EXPO_PUBLIC_SPARK_REMOTE_CONFIG_ENABLED=false
EXPO_PUBLIC_SPARK_CREATOR_TIP_LINK_ENABLED=false
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
```

Blank means blank; do not put quotation marks or sample credentials into EAS environment values.
This keeps habits, focus, routines, reminders, widgets, and backups local and avoids Spark cloud
runtime costs.

The app bundle still includes normal Android internet and Play Billing capability because the
codebase supports later optional services. A permission or SDK existing in the bundle is not the
same as Spark enabling cloud collection. Your Play declarations must nevertheless reflect the
exact uploaded binary and every active track.

## 4. Run the automated release checks

> **TL;DR — where:** PowerShell at `D:\AI\Spark`. **Do:** run
> `.\spark.cmd release -Action Verify`. **Done when:** it exits with code 0. To diagnose quickly,
> run `.\spark.cmd release -Action Inspect`, then `.\spark.cmd release` for only the fast gate.

Use the guided command from the repository root:

```powershell
.\spark.cmd check -Level Release
```

This runs the broad automated sequence and then the release-specific file/placeholder check. You
can also run only the release file check with:

```powershell
.\spark.cmd release
```

Typical messages now concern a real file mismatch, invalid asset, build failure, or an
account-authenticated task. Package identity, policy values, screenshots, listing text, audience,
and the recommended health category are already recorded locally; Play Console still requires the
publisher's personal attestation.

Do not bypass a failing release check with `--force` or by deleting the check. Resolve or document
each item.

## 5. Test a release-like native build

> **TL;DR — where:** a real Android phone plus PowerShell. **Do:** run `.\spark.cmd devices`, copy
> the printed model/ID, then run `.\spark.cmd release -Action Native -Device
> "THE_PRINTED_VALUE"` and follow the named release
> checklist. **Done when:** the physical-device items below pass, including airplane mode and a
> reboot. This local build is for behavior testing, not Play upload.

Expo Go cannot validate SQLCipher, widgets/shortcuts, app lock, screenshot protection, persistent
folder access, calendar handoff, or Play Billing.

First run the automated suite:

```powershell
.\spark.cmd check -Level Full
```

Then install a native release-like build on an emulator or phone. Use a model/ID printed by the
`devices` command, including Wi-Fi debugging phones:

```powershell
.\spark.cmd release -Action Native -Device "THE_PRINTED_VALUE"
```

If you omit `-Device`, Spark opens Expo's interactive device picker:

```powershell
.\spark.cmd release -Action Native
```

This is for device behavior testing. It is not the `.aab` you upload to Play and may use local
development signing. Follow [Testing](./testing.md) and the device sections of the
[release checklist](./release-checklist.md), especially:

- fresh install and onboarding;
- large text, TalkBack, navigation bar, and keyboard behavior;
- all six widgets and launcher shortcuts;
- reminders, Quiet now, app lock, screenshot protection, and restart recovery;
- backup/export/restore and selected-folder access;
- calendar create-event screens without calendar read permission; and
- airplane-mode use of all free core features.

## 6. Create the production Android App Bundle with EAS

> **TL;DR — where:** PowerShell at `D:\AI\Spark`, using your Expo account. **Setup is done:**
> `.\spark.cmd release -Action Project` shows `@djpokis-team/spark-adhd-habits`. **Build:** `.\spark.cmd release -Action Build -Profile
> production -Message "First internal test"`. **Download:** List, copy the exact build ID, then
> Download it. **Done when:** `artifacts\eas` contains the successful `.aab`. Hosted quota/cost
> may apply, so read the confirmation before typing it.

EAS Build is recommended for a beginner because it can create and manage the upload keystore and
produce the Play-ready bundle. Hosted EAS builds are subject to Expo's current quotas/pricing;
check [EAS Build](https://docs.expo.dev/build/) before starting. A local build avoids hosted-build
usage but requires more signing setup.

From the repository root, use Spark's guarded wrapper:

```powershell
.\spark.cmd release -Action Inspect
.\spark.cmd release -Action Setup
.\spark.cmd release -Action Build -Profile production -Message "First internal test"
```

What each action does:

- `Inspect`: locally summarizes the package IDs, versions, privacy placeholders, offline/cloud
  flags, EAS configuration, and Git state without contacting Expo.
- `Setup`: signs into Expo and links Spark to one EAS project. Run it once and review any proposed
  changes. It creates the project UUID used by `app.config.ts`.
- `Build`: reruns the fast release gate, shows the build profile/cost warning, requires typing
  `BUILD production`, uploads the source to EAS, signs it, and returns a build link.

To see the underlying commands or every optional parameter, run:

```powershell
.\spark.cmd release -Help
```

The existing `production` profile in `apps/mobile/eas.json` explicitly requests an app bundle and
auto-increments the Android build number.

### Last package-ID check before building

**TL;DR:** run `.\spark.cmd release -Action Inspect`. Continue only if Expo and generated native
Android show the permanent package ID, version `0.1.0`, and production output `app-bundle`.

First inspect Expo's production source value:

```powershell
Set-Location apps/mobile
npx.cmd expo config --type public
Set-Location ..\..
```

Find `android.package`; this is the identity EAS will use when it generates the ignored Android
folder. If you have already generated Android for local testing, also check it:

```powershell
Select-String -Path apps/mobile/android/app/build.gradle -Pattern "applicationId"
```

The Gradle value is the identity used by your current local native build. If it disagrees with
Expo, stop and follow the regeneration steps in section 1. If the file does not exist, there is no
local native folder to compare; EAS can still generate one during its build.

Spark's generated project currently targets API 36. Google requires API 35 through August 30,
2026 and has announced API 36 for new apps and updates from August 31, 2026. No SDK edit is needed
for the current project, but confirm the target reported by Play for every uploaded bundle. See
the [live target API requirement](https://developer.android.com/google/play/requirements/target-sdk).

Spark uses a dynamic `app.config.ts`. The confirmed EAS owner and public project UUID are now safe
fallbacks in that tracked configuration, and the local ignored `apps/mobile/.env` contains the
same values:

```text
EXPO_OWNER=djpokis-team
EXPO_PROJECT_ID=d13c96e7-3533-4fdb-88da-48e0b5a4f932
```

Confirm the link with `.\spark.cmd release -Action Project`. The project UUID and owner slug are
public identifiers and are also present in `.env.example`; passwords, signing credentials, and
service keys must never be committed.

After the build finishes, list and download one exact build rather than relying on an ambiguous
latest file:

```powershell
.\spark.cmd release -Action List -Profile production
.\spark.cmd release -Action Download -BuildId YOUR_EAS_BUILD_ID
```

The download goes to the ignored `artifacts/eas` folder by default.

When EAS asks about Android credentials, choosing a newly generated keystore is the simplest path
for a new app. Afterward, use EAS's credentials command/dashboard to download a protected backup
of the upload keystore and its passwords:

```powershell
.\spark.cmd release -Action Credentials
```

Store it in a password manager or secure vault; never put it in this repository, email, chat, or
a public drive.

There are two signing keys:

- the **upload key** proves bundles uploaded by you/EAS; and
- the **app-signing key** is held by Google Play and signs the optimized APKs delivered to users.

For a new app, Play App Signing normally creates and protects the final signing key when the first
bundle is uploaded. Losing an upload key is recoverable through Play; losing uncontrolled signing
material is much more serious. See [Use Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756).

An `.aab` cannot be directly tapped and installed on a phone. Test the delivered version through
Play Internal testing or download Play-generated device APKs from App bundle explorer.

## 7. Create the Play Console app

> **TL;DR — where:** [Google Play Console](https://play.google.com/console/), **Home → Create
> app**. **Enter:** default language you will maintain, `Spark`, `App`, `Free`, and your monitored
> public support email; accept the shown declarations. **Done when:** Spark's dashboard exists.
> Do not upload until you have re-confirmed the permanent package ID.

In [Google Play Console](https://play.google.com/console/):

1. Choose **Home → Create app**.
2. Default language: choose the language in which you will maintain the primary store listing.
3. App name: **Spark**.
4. Select **App**, not Game.
5. Select **Free** for the recommended first release. A Play app offered for free cannot later
   become a paid-download app. That fits Spark's plan: later Premium is an optional in-app
   one-time product while downloading Spark remains free.
6. Enter a real support email monitored by you.
7. Read and accept the developer-program and export declarations shown for your account.
8. Select **Create app**.

The default language controls the first listing you maintain; it does not prevent adding
Lithuanian or other translated store listings later. The support email is public, so use an
address you are comfortable publishing and can continue monitoring.

Creating the console entry does not change your source code. Uploading the first artifact fixes
the package ID, so re-check the bundle identity before that upload.

Google's current setup instructions are in
[Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152).

## 8. Prepare the store listing

> **TL;DR — where:** Play Console → **Grow users → Store presence → Main store listing** (or use
> the console search for **Main store listing**). **Do:** run `.\spark.cmd release -Action
> Assets`, then follow `store/android/README.md`. The complete upload-ready pack already includes
> the English default plus all 18 localized listings, icon, feature graphic, six screenshots,
> upload order, and image
> descriptions. **Done when:** the local check passes, Play shows no missing listing fields, and
> every pictured feature exists in the uploaded AAB.

Play Console path: **Grow users → Store presence → Main store listing**.

### Required text — already prepared

**TL;DR:** copy the exact fields from `store/android/listing/en-US.md`. Add
`store/android/listing/lt-LT.md` as a Lithuanian custom listing when ready. Preview both in Play
and change a claim only if the uploaded build behaves differently.

Google currently limits the app name to 30 characters, short description to 80, and full
description to 4,000. Use clear factual language; do not claim “best,” rankings, downloads,
clinical benefit, or guaranteed ADHD outcomes.

The prepared English title is `Spark ADHD Habit Tracker`; the descriptions use factual product
language, include the non-medical disclaimer, and fit the current character limits. The listing
file also records the recommended category, price, and fields that require your public support
address or privacy URL.

### Recommended category and audience starting point

**TL;DR:** choose **Productivity** and only age groups the product is actually designed for. Do
not choose child age groups or health tags merely for reach.

- Category: **Productivity** is the most natural starting category for the current product.
- Target audience: select only the age groups you actually designed for. Spark's current policy
  says it is not directed to children. Do not select child age groups merely to maximize reach;
  selecting children activates additional Families requirements.
- Tags: choose only the closest current Play tags; do not force irrelevant health tags for search
  visibility.

These are product recommendations, not answers Play has pre-approved.

### Required graphics

**TL;DR:** run `.\spark.cmd release -Action Assets`, then upload the exact files listed in
`store/android/asset-manifest.md`. Do not upload the larger launcher source from
`apps/mobile/assets`.

| Asset | Current Google requirement | Spark-specific guidance |
| --- | --- | --- |
| Play Store icon | 512×512, 32-bit PNG with alpha, maximum 1,024 KB | Ready: `store/android/graphics/app-icon-512.png`. |
| Feature graphic | 1024×500, JPEG or 24-bit PNG without alpha | Ready: `store/android/graphics/feature-graphic-1024x500.png`. |
| Phone screenshots | At least 2; JPEG or 24-bit PNG without alpha; 320–3840 px with the long side no more than twice the short side | Ready: six sanitized, real-app 1080×1920 captures under `store/android/graphics/phone`. Upload them in the manifest order. |

Google allows up to eight screenshots per supported device type and recommends alt text. The
precise current rules and cutoff zones are in
[Add preview assets](https://support.google.com/googleplay/android-developer/answer/9866151).

Do not show features that are disabled in the uploaded build. If the first build has no working
purchase flow, do not put Premium purchasing in screenshots or feature text.

### Contact and website

**TL;DR:** enter a monitored public support email and the public privacy/site URL; test both while
logged out.

A support email is required and appears publicly. A website is strongly recommended. The privacy
policy URL can be on that site. Test both from a logged-out browser.

## 9. Complete Play Console App content forms

> **TL;DR — where:** Play Console → **Policy → App content** (or search the console for **App
> content**). **Do:** complete every card shown for the uploaded AAB; the recommended offline
> answers are summarized below and written as a form worksheet in
> `store/android/declarations.md`. **Done when:** no App content task is marked incomplete. You
> must personally review/attest the live forms; save uncertain health/legal classifications as
> drafts instead of guessing.

Path: **Policy and programs → App content**. The exact cards shown can vary by account, country,
SDK, permissions, and uploaded bundle. Save uncertain forms as drafts instead of guessing.
Use `store/android/declarations.md` as the authoritative current-build answer sheet; the sections
below explain why the answers were chosen.

### Privacy policy

**TL;DR:** paste the public HTTPS `privacy.html` URL and click it after saving to verify it opens.

Enter the public `https://.../privacy.html` URL prepared earlier. Open the link from the console
after saving it.

### Ads

**TL;DR:** for the documented first build, answer **No**.

Current Spark answer: **No, the app does not contain ads**. A Premium purchase is not an ad.

### App access

**TL;DR:** select that no special access is required and paste the offline-build explanation
below. Change this if any reviewer-visible feature later needs login or payment.

For the free/offline build, all core features work without login. Explain that no credentials are
required. If a later build places any reviewer-relevant feature behind an account, purchase, or
special setup, provide complete review instructions and test access in this form.

Example for the offline build:

```text
No account or sign-in is required. Onboarding creates local example habits. All core habit,
routine, focus, capture, reminder, widget, and backup screens are available on-device.
```

### Data safety

**TL;DR:** for an Internal-only offline build, review the form but keep the future cloud features
out of scope. Before Closed/Open/Production, submit an accurate form stating that local-only data
is not transmitted; reassess every SDK and any cloud-enabled artifact.

Complete this from the behavior of the exact active binaries, not from future plans.

For a strictly offline build with every cloud value blank and no analytics/ads, local habits,
focus titles, and captured thoughts are not transmitted to the developer. Google says on-device-
only access does not count as collection for this form. You must still submit the form and privacy
policy before Closed/Open/Production distribution and verify the behavior of all bundled SDKs.

If any active build enables support or purchase verification, review at least:

- user IDs: random Firebase UID;
- user-generated content: support messages the user sends;
- app information: version/platform used for support; and
- purchase history/order information used to verify access.

Collection for those optional features should be marked optional only if every user can genuinely
choose not to use it. Update the form whenever distributed behavior changes. Play uses one global
Data safety declaration for the package across active versions/tracks. See
[Data safety](https://support.google.com/googleplay/android-developer/answer/10787469) and the
Spark-specific [privacy and policy guide](./09-data-privacy-and-play-policy.md).

### Content rating

**TL;DR:** complete the IARC questionnaire in Play Console using the actual app/free-text content;
do not copy a desired rating from this guide.

Complete the IARC questionnaire honestly from the content visible in the app, including user-
generated free text and any web content reachable inside it. Do not select an answer merely to
obtain a lower rating. Retake it if relevant content changes. See
[Content Ratings](https://support.google.com/googleplay/android-developer/answer/9898843).

### Target audience and children

**TL;DR:** select only intended adult/older-teen groups that match your policy and listing. Do not
select children unless you deliberately redesign and review Spark for Families requirements.

Choose the age groups Spark is actually intended for. The current product/policy is not directed
to children. Selecting any child age group may make the Families Policy apply. Ensure the store
copy, graphics, privacy policy, and actual UX agree with the selected audience.

### Health apps declaration

**TL;DR:** open **App content → Health apps → Start**, review whether Spark's ADHD/well-being
positioning fits a listed health feature, and save as draft if uncertain. This is your policy/legal
classification; keep the non-medical disclaimer regardless.

Every app on Closed, Open, or Production tracks must complete this declaration, even if it claims
no health features. Spark's ADHD positioning means you should not automatically choose “no health
features” without reviewing the current store wording.

The closest listed category may be **Stress Management, Relaxation, Mental Acuity**, while a
strictly productivity-positioned tool may lead to a different conclusion. This is a policy/legal
classification decision for the exact listing; save a draft and ask Play Console support or an
appropriate reviewer if uncertain.

If Spark is declared within health scope:

- keep the public, non-geofenced HTML privacy policy;
- retain the non-medical disclaimer in the listing and app;
- make no diagnosis, treatment, cure, prevention, or clinical-effectiveness claim;
- state the app's organization/self-management purpose; and
- do not add Health Connect, sensor, location, or accessibility-service permissions without a new
  product and policy review.

See the official [Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291)
and [Health content and services policy](https://support.google.com/googleplay/android-developer/answer/16679511).

### Permissions declaration

**TL;DR:** answer only after uploading the AAB. If Play asks for a sensitive-permission
declaration, inspect the bundle instead of inventing a use case; Spark is designed not to request
the sensitive permissions listed below.

Play inspects the uploaded AAB. Spark intentionally removes calendar read/write, media library,
broad storage, overlay, location, contacts, microphone/recording, and accessibility-service
permissions. It uses the system create-event and folder-picker interfaces instead.

If Play shows a sensitive Permissions Declaration alert, do not invent a justification. Inspect
the App bundle explorer/merged manifest and remove an unintended permission or document the real
core use. See [Declare permissions](https://support.google.com/googleplay/android-developer/answer/9214102).

### Other common declarations

**TL;DR:** use the current offline product facts: no ads, no news, no government affiliation, no
required account, and no financial-services feature. Answer the exact Play wording shown.

- Financial features: ordinary in-app Premium access is not banking/credit, but answer the exact
  current form.
- Government affiliation: no, unless a real authorized affiliation exists.
- News: no for the current product.
- Ads: no.
- Content rating and target audience: complete as described above.
- Account deletion: Spark has no required account. If optional cloud identity is enabled, the
  in-app deletion path and privacy policy must accurately describe deletion and retained legal/
  fraud records.

## 10. Upload the first AAB to Internal testing

> **TL;DR — where:** Play Console → **Test and release → Internal testing**. **Do:** add
> your tester Google account, create a release, enable Play App Signing, upload the exact
> downloaded `.aab`, add the release note below, review, and roll out to Internal. **Done when:**
> the opt-in link installs Spark from Google Play. The first upload is manual.

Manual upload is simplest and does not require a Google Play API service account:

1. Download the `.aab` with `.\spark.cmd release -Action Download -BuildId YOUR_EAS_BUILD_ID`.
2. In Play Console open **Test and release → Internal testing** (or use the left-menu search).
3. Open the **Testers** tab and create an email list or Google Group. Testers need Google accounts.
4. Open the **Releases** tab and choose **Create new release**.
5. Accept/configure Play App Signing when prompted.
6. Upload the `.aab`.
7. Confirm the package name, version name, version code, target API, supported devices, and
   permissions shown by Play.
8. Add release notes, for example:

```text
Initial internal test of Spark's offline habit, routine, focus, reminder, backup, and widget tools.
```

9. Resolve Play's errors; read warnings rather than automatically dismissing them.
10. Choose **Review release**, then start/roll out the Internal test.
11. Copy the tester opt-in link and open it with the same Google account added as a tester.
12. Install Spark from Google Play. A sideloaded build is not equivalent for purchase and delivery
    testing.

Internal testing supports up to 100 testers and can be used before every listing/policy item is
complete. The first test link can take time to appear. Details are in
[Set up an internal test](https://support.google.com/googleplay/android-developer/answer/9845334)
and [Prepare a release](https://support.google.com/googleplay/android-developer/answer/9859348/prepare-and-roll-out-a-release).

The first upload must be manual because Google Play does not allow API submission before one
manual artifact exists. For later updates, after configuring a least-privilege Google service
account for EAS Submit, Spark can submit one exact build to a non-production track:

```powershell
.\spark.cmd release -Action Submit -Track internal -BuildId YOUR_EAS_BUILD_ID
```

Submission defaults to Internal, never Production, and requires a confirmation containing both
the track and build ID. EAS Submit uploads the binary only; store metadata, screenshots, tester
lists, declarations, review, and rollout decisions still live in Play Console.

## 11. Test the Play-installed build

> **TL;DR — where:** a physical Android phone using the Internal-test Google account, plus Play
> Console's **Pre-launch report** and **Android vitals**. **Do:** install from the Play link and
> execute every bullet below. **Done when:** no release-blocking crash/ANR/security/accessibility
> issue remains and an upgrade preserves local data.

Do not only confirm that it opens. Test the actual release behavior:

- uninstall the development build if necessary, then install from the Play link;
- onboarding and keyboard/navigation-bar spacing;
- encrypted local storage status in Settings;
- notifications after reboot;
- each widget after app restart and device reboot;
- Share to Spark from another Android app;
- calendar handoff without calendar-read permission;
- backup/export/restore;
- app lock and screenshot protection;
- airplane-mode operation; and
- upgrade from one internal version to the next without losing data.

Review **Pre-launch report**, **Android vitals**, crashes, ANRs, startup, battery, accessibility,
and device-compatibility results in Play Console. Automated pre-launch devices do not replace a
physical-phone pass.

## 12. Closed testing and production access

> **TL;DR — where:** Play Console → **Test and release → Closed testing** and your app Dashboard. **Do:**
> follow the tester count/duration Play shows for your account; new personal accounts commonly
> require 12 continuously opted-in testers for 14 days. **Done when:** Play grants production
> access and the Closed-test feedback has been reviewed.

After internal testing, move representative testers to a Closed track. Testers may need to opt out
of Internal before opting into Closed.

For personal developer accounts created after November 13, 2023, Google currently requires at
least **12 testers continuously opted into a Closed test for 14 days** before applying for
production access. Your existing account may or may not be subject to this; Play Console's
Dashboard is authoritative. Google also asks about the test, app value, and production readiness.
See [personal-account testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465).

Recommended rollout:

1. Internal testing: you and devices/accounts you control.
2. Closed testing: accessibility and ADHD-experience testers on varied devices.
3. Apply for production access if Play requires it.
4. First Production release only after policy and test sign-off.
5. Use staged rollouts for later updates; the initial production launch is handled differently
   from update rollouts.

## 13. Add Premium and cloud only after the free build is stable

> **TL;DR — not part of the first release.** Leave cloud, Premium, admin, purchases, RTDN, and the
> creator-tip flag off. Return to this section only after the offline Internal/Closed build is
> stable; then follow the linked monetization/cloud guides and update Play disclosures first.

Do not create the product merely to satisfy the first upload. When ready, follow
[Monetization](./06-monetization.md) and [Google Cloud setup](./04-google-cloud.md).

The intended one-time product ID is:

```text
spark_premium_lifetime
```

At that later stage you will need to:

1. deploy the control plane;
2. create and activate the Play one-time product and regional purchase option/prices;
3. connect a least-privilege Play Developer API service account;
4. add license testers;
5. enable mobile remote configuration only in the cloud-enabled build;
6. enable purchases in Spark config only after verification succeeds;
7. configure and authenticate RTDN for refunds/revocations; and
8. update Data safety and privacy disclosures before distributing that behavior.

EAS manual AAB upload does not require that service account. The account is needed for Spark's
server-side purchase verification and/or automated store submission, not for the initial manual
Internal upload.

## 14. Versions for later uploads

> **TL;DR — where:** `apps/mobile/package.json` and `apps/mobile/app.config.ts`. **Do:** set the
> same meaningful public version in both; EAS production auto-increments `versionCode`. **Verify:**
> `.\spark.cmd release -Action Inspect` before every build and confirm Play shows a higher code.

Every uploaded update must have a higher Android `versionCode`. Spark's EAS production profile has
`autoIncrement: true`, but still set a meaningful public version.

Update and keep consistent:

- `version` in `apps/mobile/package.json`;
- `version` in `apps/mobile/app.config.ts`; and
- the local native Android `versionName` by regenerating `apps/mobile/android` before local
  release-like tests, if that ignored folder already exists.

Before uploading, inspect the version displayed by EAS and Play Console. Never reuse a
`versionCode`, even if the older release was only a draft or test.

## Final pre-upload checkpoint

> **TL;DR:** complete this checklist immediately before uploading the first `.aab`. If any answer
> is no, stop at that item; do not compensate by uploading directly to Production.

Before the **first Internal AAB upload**, you should be able to answer yes to these:

- [ ] I intentionally chose the permanent package ID.
- [ ] The `.aab` shows that exact package ID.
- [ ] The privacy placeholders are resolved, or I understand that an Internal-only upload can
      precede the public policy but Closed/Open/Production cannot.
- [ ] The first build's cloud and creator-tip flags are deliberately off or accurately disclosed.
- [ ] `.\spark.cmd check -Level Release` passes except for understood decision warnings.
- [ ] I tested a native release-like build on Android.
- [ ] I have an Expo/EAS account and a protected backup of the upload credentials.
- [ ] Any store copy/screenshots already entered show only features present in this build.
- [ ] I know whether my Play account requires the 12-testers/14-days Closed test.
- [ ] I will upload to Internal testing, not directly to Production.

After upload, continue with the more detailed [release checklist](./release-checklist.md).

## Official references

> **TL;DR:** you do not need to read every link. Use the matching official link only when a Play
> or EAS screen differs from this guide; Google/Expo documentation overrides stale menu labels.

- [Create and set up a Play app](https://support.google.com/googleplay/android-developer/answer/9859152)
- [Play testing tracks](https://support.google.com/googleplay/android-developer/answer/9845334)
- [Prepare and roll out a release](https://support.google.com/googleplay/android-developer/answer/9859348/prepare-and-roll-out-a-release)
- [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)
- [Store listing preview assets](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Prepare your app for review](https://support.google.com/googleplay/android-developer/answer/9859455)
- [Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291)
- [Health content and services](https://support.google.com/googleplay/android-developer/answer/16679511)
- [Target API requirement](https://developer.android.com/google/play/requirements/target-sdk)
- [EAS Build](https://docs.expo.dev/build/)
- [EAS Submit for Android](https://docs.expo.dev/submit/android/)
- [Android AAB versus APK with EAS](https://docs.expo.dev/build-reference/apk/)
