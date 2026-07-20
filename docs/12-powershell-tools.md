# PowerShell command helper

Spark includes a guided Windows command helper so you do not need to remember or copy individual
npm, Expo, EAS, Firebase, Terraform, Google Cloud, Java, or `adb` commands.

Because Windows may use a restrictive PowerShell execution policy, run the small command wrapper:

```powershell
.\spark.cmd
```

This launches the underlying [`spark.ps1`](../spark.ps1) script with a process-only execution
policy bypass. It does not change your machine's execution policy.

## Discover commands

```powershell
.\spark.cmd help
.\spark.cmd start -Help
.\spark.cmd help -Topic test
```

The most useful commands are:

```powershell
.\spark.cmd setup-android -Persist
.\spark.cmd doctor
.\spark.cmd start -Target Web -Clear
.\spark.cmd emulator -List
.\spark.cmd android
.\spark.cmd devices
.\spark.cmd test -Scope Mobile
.\spark.cmd test -Coverage
.\spark.cmd check -Level Full
.\spark.cmd release -Action Inspect
.\spark.cmd deploy -Action Status
```

## First-time Android setup

```powershell
.\spark.cmd setup-android -Persist
```

The helper searches for Android Studio's bundled Java and the standard Android SDK directory. It:

- configures the current command process;
- verifies Java and `adb`;
- lists connected devices;
- with `-Persist`, saves `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and the relevant user
  `Path` entries.

Reopen terminal windows after using `-Persist`.

## Start targets

```powershell
.\spark.cmd start
.\spark.cmd start -Target Web
.\spark.cmd start -Target ExpoGo
.\spark.cmd start -Target DevClient -Clear -Port 8090
```

`DevClient` is the default and is the correct choice after installing the native Spark
development build. Web and Expo Go are limited previews.

## Test and build scopes

```powershell
.\spark.cmd test -Scope All
.\spark.cmd test -Scope Mobile -Coverage
.\spark.cmd build -Scope Admin
.\spark.cmd build -Scope Mobile
```

Supported test scopes are `All`, `Mobile`, `Domain`, `Api`, and `Admin`. Build also supports
`Packages`.

## Validation levels

```powershell
.\spark.cmd check -Level Quick
.\spark.cmd check -Level Full
.\spark.cmd check -Level Release
```

- `Quick`: doctor, TypeScript, and all automated tests.
- `Full`: Quick plus coverage thresholds and production builds.
- `Release`: Full plus release file and placeholder checks.

## Android release utilities

Start with the built-in action list:

```powershell
.\spark.cmd release -Help
```

The **Spark application** is the mobile product. The **`spark.cmd` launcher** is only the Windows
helper that runs repository commands. EAS means **Expo Application Services**, an optional hosted
build provider; it is not used by the normal local Android process below.

The normal first-release sequence is:

```powershell
# 1. Show whether the private local upload key and generated signing guard exist.
.\spark.cmd release -Action LocalStatus

# 2. One time only: create the private upload key on this PC.
# First create a unique 20+ character password in LastPass.
.\spark.cmd release -Action LocalSetup

# 3. Fast, read-only identity, version, feature-flag, privacy, and Git summary.
.\spark.cmd release -Action Inspect

# 4. Full local validation. This can take several minutes.
.\spark.cmd release -Action Verify

# 5. Regenerate and validate the upload-ready Play graphics. Local-only and free.
.\spark.cmd release -Action Assets

# 6. Build and verify the signed production AAB on this PC.
.\spark.cmd release -Action LocalBuild

# 7. One time after Play has accepted the first bundle: prepare the publisher identity/key.
.\spark.cmd release -Action PlaySetup -ProjectId djpokis-spark-habits

# 8. After granting the printed email Play Console testing-release permission, verify access.
.\spark.cmd release -Action PlayStatus

# 9. Build and publish a new Internal-testing version with one command.
.\spark.cmd release -Action LocalPublish -Track internal

# 10. Review timestamped build, setup, status, success, and failure records.
.\spark.cmd release -Action History
```

`LocalSetup` calls Android Studio's `keytool` locally. It creates
`apps/mobile/credentials/spark-upload.p12`, which is ignored by Git. The command never receives or
stores the password: `keytool` asks for it through hidden prompts. Immediately attach the `.p12`
file to the LastPass item containing that password, and record alias `spark-upload` plus the
printed SHA-256 file hash. If the file already exists, setup refuses to replace it.

`LocalBuild` regenerates the ignored native Android project from `app.config.ts`, runs the release
gate, gets the upload-key password from either a hidden prompt or an explicitly selected ignored
secrets file, unlocks the key in memory, and starts one non-daemon Gradle build. The Play bundle
targets `armeabi-v7a` and `arm64-v8a`, covering 32-bit and 64-bit ARM phones/tablets, and limits
Gradle/CMake concurrency to two workers so Windows does not terminate memory-heavy native C++
compilation. Normal debug builds still include x86 targets for Android emulators. It then verifies:

- that the App Bundle has a valid non-debug signature;
- package ID `com.djpokis.sparkhabits.app`;
- package/version metadata emitted by the same Gradle bundle build; and
- a SHA-256 artifact hash.

The output is `artifacts/release/spark-application-android-VERSION-CODE.aab` plus a matching
`.sha256` file. A timestamped, secret-free JSON record is added to `artifacts/release/history`, and
`latest-build.json` is refreshed. The password is removed from the process environment when Gradle
finishes. No EAS request is made and no EAS hosted-build allowance is used.

### One-command local Google Play publishing

`PlaySetup` is a guarded one-time action. It enables `androidpublisher.googleapis.com` in the
existing `djpokis-spark-habits` Google Cloud project, creates the `spark-play-publisher` service
account if absent, creates one ignored JSON key if absent, and writes an ignored secrets-file shell.
It does **not** grant itself Play Console access and cannot accept legal agreements. Immediately:

1. attach `apps/mobile/credentials/google-play-publisher.json` to a LastPass secure note;
2. open Play Console → **Users and permissions → Invite new users**;
3. paste the service-account email printed by `PlaySetup`;
4. grant access only to `com.djpokis.sparkhabits.app`;
5. grant **View app information (read only)** and **Release apps to testing tracks**;
6. do not grant Finance, Admin, or Production permissions; and
7. run `PlayStatus`.

`PlayStatus` authenticates, creates and deletes a disposable Play edit, and records the bundle
codes and tracks visible to the credential. It does not upload or commit a release. A 403 normally
means the service-account email has not received the app-level permission above.

After that one-time setup, the routine command is:

```powershell
.\spark.cmd release -Action LocalPublish -Track internal
```

It performs, in order:

1. authenticate without printing the private credential or token;
2. query Google Play's highest reserved bundle version code;
3. advance `android.versionCode` in `apps/mobile/app.config.ts` only if the local code was already
   used (use `-NoAutoVersionCode` to refuse instead);
4. show the exact version, track, and status and request confirmation;
5. run the complete local signed build and verification;
6. upload the AAB into a disposable Play edit;
7. update the selected track, validate the edit, and commit it; and
8. save timestamped build and publish JSON records, including links and previous track state.

`Auto` release status means `Completed` for Internal/Alpha/Beta and `Draft` for Production. Examples:

```powershell
# Normal safe path
.\spark.cmd release -Action LocalPublish -Track internal

# Save a Production draft for review in Play Console; typed confirmation is mandatory.
.\spark.cmd release -Action LocalPublish -Track production

# Start a deliberate 10% Production rollout after Play access/policy approval.
.\spark.cmd release -Action LocalPublish -Track production `
  -ReleaseStatus InProgress -RolloutPercent 10
```

Production never honors `-Yes`; it always requests the exact typed confirmation. Google can still
review or reject a committed edit, and Play's required forms, testing thresholds, agreements, and
production-access decision remain manual.

### Prompt versus ignored secret file

With no secrets file, `LocalBuild`/`LocalPublish` request the upload password with a hidden prompt,
and publisher actions ask for the service-account JSON path. To remove those repeated prompts on a
trusted single-user PC:

```powershell
Copy-Item apps/mobile/credentials/local-release.secrets.example.json `
  apps/mobile/credentials/local-release.secrets.json
```

Fill it from LastPass, or pass a different ignored file with `-SecretsFile`. Secret values are
never accepted as command-line parameters. The convenience file contains a plaintext password;
do not use it on a shared PC. Both the file and referenced service-account JSON must be outside the
repository or covered by `.gitignore`, otherwise the launcher refuses to continue.

Release notes default to `store/android/release-notes/current.json`. The file maps Play language
codes to 1–500 character notes. Use `-ReleaseNotesFile` to select a different JSON file.

### JSON release history and URL catalog

Every build, Play setup/status, and publish attempt—including canceled and failed attempts—writes a
record under `artifacts/release/history`. Convenience pointers are refreshed alongside it:

- `latest-build.json`;
- `latest-play-setup.json`;
- `latest-play-status.json`; and
- `latest-publish.json`.

Run `.\spark.cmd release -Action History` to list recent records. Each publish record contains
package/version/track/status, artifact path/hash/size, service-account email, source commit/branch,
prior Play state, API result, and known Console/store/test/privacy URLs. It contains no password,
private key, OAuth assertion, or access token.

Edit the tracked `store/android/publisher-config.json` to preserve URLs that Google does not expose
through the publishing API. Copy the numeric developer ID and app ID from a Play Console URL and
the tester opt-in URLs from each track's **Testers** tab. Blank values remain `null` in output JSON
rather than being guessed.

`Inspect` does not contact Expo or Google. It reports values without printing API URLs, Firebase
configuration, or other environment values. `Assets` locally regenerates and validates the
tracked 512×512 icon, 1024×500 feature graphic, and six 1080×1920 screenshots. Neither action
signs in, uploads, deploys, or creates a bill.

For phone testing without using the production key:

```powershell
.\spark.cmd release -Action Native -Device THE_DEVICE_VALUE
```

This produces an optimized, debug-signed APK and installs it on the chosen device. It is useful
for behavior QA but must never be uploaded to Google Play.

For the **first** Google Play upload, upload the locally produced `.aab` manually through Play
Console. Once Play has registered the package, later releases can use `LocalPublish`. Neither path
requires an Expo login or EAS.

### Optional EAS hosted-build commands

Only use these explicitly named actions if you later choose Expo Application Services as a hosted
alternative. They are not part of the local process and `EasBuild` may consume quota or cost
money. The cost guard is off by default; after reviewing current Expo pricing and how the local
upload key will be migrated, enable it only in the current PowerShell process:

```powershell
$env:SPARK_ALLOW_EAS_RELEASES = 'true'
.\spark.cmd release -Action EasSetup
.\spark.cmd release -Action EasProject
.\spark.cmd release -Action EasCredentials
.\spark.cmd release -Action EasBuild -Profile production
.\spark.cmd release -Action EasList -Profile production
.\spark.cmd release -Action EasDownload -BuildId YOUR_EAS_BUILD_ID
.\spark.cmd release -Action EasSubmit -Track internal -BuildId YOUR_EAS_BUILD_ID
```

The old ambiguous `Setup`, `Build`, `List`, and similar action names now stop with an explanation;
they cannot accidentally start a hosted build. The `EasBuild` action shows a quota/cost warning
and requires both the process-scoped flag and a typed confirmation before contacting EAS. Close
the PowerShell window or run `Remove-Item Env:SPARK_ALLOW_EAS_RELEASES` to disable it again.

## Deployment utilities

Cloud remains optional. Begin with the read-only status command:

```powershell
.\spark.cmd deploy -Action Status
```

It reports whether Google Cloud CLI, Terraform, and local configuration exist, then displays every
cost-bearing Terraform switch without contacting Google. With no `terraform.tfvars`, Spark reports
that no cloud deployment is configured.

### Authentication

```powershell
.\spark.cmd deploy -Action Login -Provider Firebase
.\spark.cmd deploy -Action Login -Provider Google -ProjectId djpokis-spark-habits
```

Google login performs both normal CLI authentication and Application Default Credentials login.
Supplying `-ProjectId` also selects that project locally.

### Privacy/admin Hosting only

This was completed for project `djpokis-spark-habits` on July 17, 2026. Run it again only after a
privacy-page or static-dashboard change that you deliberately want to publish.

```powershell
.\spark.cmd deploy -Action Hosting -ProjectId djpokis-spark-habits
```

This runs the release placeholder check, builds the admin/static privacy site, prints the exact
project, and requires `DEPLOY HOSTING djpokis-spark-habits`. It does not deploy Cloud Run or Firestore.
Firebase Hosting allowances/overages still apply.

### Hosting plus Firestore rules/indexes

```powershell
.\spark.cmd deploy -Action Firebase -ProjectId djpokis-spark-habits
```

This is for a deliberately configured cloud project. It deploys only
`hosting,firestore:rules,firestore:indexes` and requires a different typed confirmation.

### Guarded Terraform plan and apply

First create and edit the ignored operator file described in the
[Google Cloud guide](./04-google-cloud.md):

```powershell
Copy-Item infra\terraform\terraform.tfvars.example infra\terraform\terraform.tfvars
.\spark.cmd deploy -Action Plan
```

`Plan` runs `terraform init`, formatting checks, validation, and creates
`infra\terraform\spark.tfplan`. It immediately prints the saved plan for review. Plan files may
contain sensitive values and are ignored by Git.

Only after reviewing that exact output:

```powershell
.\spark.cmd deploy -Action Apply
```

`Apply` refuses to continue if Terraform source or the variable file changed after the plan. It
shows the plan again and requires typing `APPLY <project-id>`. The project can also be repeated
with `-ProjectId`; a mismatch is rejected. This applies only the saved plan—it does not silently
create a new one.

After an apply:

```powershell
.\spark.cmd deploy -Action Outputs
```

### Build the optional control-plane image

After Terraform has created the Artifact Registry repository:

```powershell
.\spark.cmd deploy -Action Image -ProjectId djpokis-spark-habits
```

Spark tests and builds the API locally first, then shows the complete image URI and requires
`BUILD IMAGE djpokis-spark-habits`. Google Cloud Build and Artifact Registry can generate costs. The
default image tag is the mobile app version; override it with `-ImageTag`. The command prints the
exact `container_image` value to place into `terraform.tfvars`, after which you create and review a
new Terraform plan.

## External-change safety

These actions can change external state and therefore ask for typed confirmation:

- `release -Action EasBuild`;
- `release -Action EasSubmit`;
- `deploy -Action Hosting`;
- `deploy -Action Firebase`;
- `deploy -Action Image`; and
- `deploy -Action Apply`.

`-Yes` skips confirmation for automation but does not skip validation, project-ID checks, exact
build selection, or saved-plan freshness checks. There is intentionally no scripted Terraform
destroy, Play production default, automatic feature enabling, or automatic first Play upload.

## Android utilities

```powershell
.\spark.cmd emulator -List
.\spark.cmd emulator -Avd Pixel_9_API_36
.\spark.cmd devices
.\spark.cmd android -Select
.\spark.cmd android -Device 25113PN0EG
.\spark.cmd logs
.\spark.cmd reset-app
```

`devices` labels USB, Wi-Fi, and emulator connections and prints the exact launch command for each
ready target. Offline or unauthorized devices are labeled as not launchable. Wi-Fi ADB IDs can
change after reconnecting, so prefer the freshly printed phone model or rerun `devices` rather
than keeping an old `_adb-tls-connect._tcp` ID. Expo normally resolves only device display names.
Spark's launcher also accepts the exact
ADB ID, including wireless mDNS IDs and emulator IDs:

```powershell
.\spark.cmd android -Device "adb-d64c77ee-example._adb-tls-connect._tcp"
.\spark.cmd android -Device "emulator-5554"
```

Use `android -Select` when you prefer an interactive picker. When more than one target is connected,
also use `-Device` with `logs` and `reset-app` so the command cannot affect the wrong device.

`reset-app` requires typing `RESET` because it destroys all local Spark data and secure keys. The
`-Yes` option exists for automation but should be used carefully.

## Optional local cloud tools

Use separate terminals for long-running services:

```powershell
.\spark.cmd emulators
.\spark.cmd api
.\spark.cmd admin
```

After Firebase emulators are running:

```powershell
.\spark.cmd seed
```

These services are optional. The offline mobile app does not need them.
