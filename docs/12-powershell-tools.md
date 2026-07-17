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

The normal first-release sequence is:

```powershell
# 1. Fast, read-only summary of IDs, versions, flags, privacy, EAS, and Git state.
.\spark.cmd release -Action Inspect

# 2. Full local validation. This can take several minutes.
.\spark.cmd release -Action Verify

# 3. Regenerate and validate the upload-ready Play graphics. Local-only and free.
.\spark.cmd release -Action Assets

# 4. One-time Expo/EAS login and project link.
.\spark.cmd release -Action Setup

# 5. Queue a signed production AAB build after a typed confirmation.
.\spark.cmd release -Action Build -Profile production -Message "First internal test"

# 6. Review recent builds and copy the exact successful build ID.
.\spark.cmd release -Action List -Profile production

# 7. Download that exact AAB to the ignored artifacts\eas folder.
.\spark.cmd release -Action Download -BuildId YOUR_EAS_BUILD_ID
```

`Inspect` does not contact Expo or Google. It reports values without printing API URLs, Firebase
configuration, or other environment values. Local `.env` status is shown separately because
those ignored files are not proof of the environment configured in EAS.

`Assets` locally regenerates and validates the tracked 512×512 icon, 1024×500 feature graphic,
and six 1080×1920 screenshots. It does not sign in, upload, deploy, or create a bill. The upload
map, listing copy, and declaration worksheet are in `store/android/README.md`.

`Build -Profile production` first runs the fast release check, then requires typing
`BUILD production`. Development/preview builds run the mobile type check instead, so unfinished
store-listing text does not block ordinary device testing. Hosted EAS quota or charges can apply;
build cost is related to build frequency, not app user count.
`-NoWait` returns after queueing and `-ClearCache` requests a clean EAS build. Use `-Yes` only in
deliberate automation because it skips the typed confirmation.

For the **first** Google Play upload, download the AAB and upload it manually through Play Console.
Google requires at least one manual upload before API submissions work. For later releases, after
a least-privilege Google service-account key is configured for EAS Submit:

```powershell
.\spark.cmd release -Action Submit -Track internal -BuildId YOUR_EAS_BUILD_ID
```

Submission always requires an exact build ID; Spark never submits an ambiguous “latest” build.
The wrapper displays the build and track and requires typing a confirmation containing both.
`internal`, `alpha`, `beta`, and `production` map to explicit profiles in
`apps/mobile/eas.json`. Production is never the default.

To inspect, create, or securely download a backup of Android signing credentials, use the EAS
interactive manager through Spark:

```powershell
.\spark.cmd release -Action Credentials
```

Read every EAS prompt. Store any downloaded keystore and passwords in a password manager or secure
vault, never in this repository.

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
.\spark.cmd deploy -Action Login -Provider Google -ProjectId YOUR_PROJECT_ID
```

Google login performs both normal CLI authentication and Application Default Credentials login.
Supplying `-ProjectId` also selects that project locally.

### Privacy/admin Hosting only

```powershell
.\spark.cmd deploy -Action Hosting -ProjectId YOUR_PROJECT_ID
```

This runs the release placeholder check, builds the admin/static privacy site, prints the exact
project, and requires `DEPLOY HOSTING YOUR_PROJECT_ID`. It does not deploy Cloud Run or Firestore.
Firebase Hosting allowances/overages still apply.

### Hosting plus Firestore rules/indexes

```powershell
.\spark.cmd deploy -Action Firebase -ProjectId YOUR_PROJECT_ID
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
.\spark.cmd deploy -Action Image -ProjectId YOUR_PROJECT_ID
```

Spark tests and builds the API locally first, then shows the complete image URI and requires
`BUILD IMAGE YOUR_PROJECT_ID`. Google Cloud Build and Artifact Registry can generate costs. The
default image tag is the mobile app version; override it with `-ImageTag`. The command prints the
exact `container_image` value to place into `terraform.tfvars`, after which you create and review a
new Terraform plan.

## External-change safety

These actions can change external state and therefore ask for typed confirmation:

- `release -Action Build`;
- `release -Action Submit`;
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
