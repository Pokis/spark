# Run the mobile app

## Fastest first look

Install dependencies and start Expo:

```powershell
npm.cmd install
.\spark.cmd start -Target ExpoGo
```

Expo Go can preview most ordinary screens, but it does **not** accurately include Spark's
SQLCipher, Android widgets/shortcuts, Android share receiver, notification actions,
biometric/device lock, sensitive-preview protection, user-selected folder persistence,
system-calendar handoff, offline-audio native configuration, or Play Billing code. Use it only
for a quick UI preview.

The default `.\spark.cmd start` target is `DevClient`. Its QR code begins with the Spark development
scheme and opens only in an already-installed Spark development build; Expo Go will ignore it.

Press `w` in the Expo terminal for the browser preview. Web uses Expo SQLite's alpha WASM
implementation and is not a release target; Android development builds remain authoritative for
storage, privacy, notifications, widgets, and native integrations.

## Recommended Android development build

Start an emulator or connect a USB-debuggable phone, then run:

```powershell
.\spark.cmd android -Select
```

The first run generates the native Android project, downloads Gradle dependencies, builds a
development client, installs it, and starts the app. It can take several minutes.

For later sessions:

```powershell
.\spark.cmd start -Target DevClient
```

Then open the already installed Spark development client.

## EAS development build without local Android compilation

Create a free Expo account, install EAS CLI through `npx`, and initialize the project once:

```powershell
Set-Location apps/mobile
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest init
npx.cmd eas-cli@latest build --platform android --profile development
Set-Location ..\..
```

Store the resulting Expo owner and project ID in `apps/mobile/.env.local` for local configuration
and in the appropriate EAS environment for cloud builds. Download the resulting APK to an Android
phone and run:

```powershell
npm.cmd run start -- --dev-client
```

Check current EAS plan quotas before relying on cloud builds. Local Android builds do not consume
EAS build quota.

## What works with no `.env`

- onboarding
- habits and flexible schedules
- Today recommendations and completion celebrations
- rhythms, rewards, focus, capture, and routines
- local reminders
- five Android widgets—Today, Quick Capture, Focus, Progress, and Toolkit—plus four launcher shortcuts in a native build
- Android Share to Spark in a native build
- locally generated focus soundscapes in a native build
- JSON, encrypted, automatic-folder backup and restore
- Simple mode, Help me now, weekly reset, friction plans, Departure mode, selected-win sharing,
  and personal experiments
- device authentication/app-preview protection and privacy-safe diagnostics
- 15 bundled languages including Lithuanian

Support, admin, and verified purchase buttons remain safely disabled.

## Optional local environment

Expo loads environment files from the mobile project directory, not the monorepo root. Copy the
mobile template only after deploying the cloud service:

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env.local
```

Fill the `EXPO_PUBLIC_` values. Never put a service-account key, Play Console credential, private
API secret, or Terraform state in this file. Expo embeds every `EXPO_PUBLIC_` value in the
application bundle, so treat those values as public configuration.

## Reset test data

Uninstall Spark or clear its storage in Android Settings. This removes the SQLCipher database,
secure key, generated recovery code, and folder grant. Export a JSON or encrypted backup and copy
the recovery code first if you need to restore later.

## Add the Android widgets and launcher shortcuts

After installing a native build:

1. Long-press an empty area of the Android home screen.
2. Choose **Widgets**.
3. Find **Spark Today**, **Spark Quick Capture**, **Spark Focus**, **Spark Progress**, or
   **Spark Toolkit**.
4. Drag it to the home screen.

The Today widget updates when Spark data changes and receives a periodic Android refresh. Its
action is labeled **Log tiny**, but tapping it first opens a confirmation screen. The confirmation
offers **Log tiny win**, **Open Today without logging**, and **Not now**. The Quick Capture widget
opens the minimal local capture form and does not create an item until **Park it** is pressed.
The Focus widget derives remaining time from the persisted session timestamps and opens narrow
pause/resume action routes. Android launchers may refresh the displayed minute label only on their
own schedule, but opening Pause/Resume always recalculates from the database.
The Progress widget shows lifetime wins, fixed Spark points, and today’s count, then opens the
local Progress screen. Toolkit opens Capture, two-minute Focus, Departure, or Help in one tap.
All five widgets use local snapshots/static links and add **$0** server cost. Because widget
definitions are native configuration, run `./spark.cmd android` again after pulling a widget
change; an Expo Go reload cannot install new widget definitions.

Long-press Spark's launcher icon to open **Quick capture**, **2-minute focus**,
**Rescue my day**, or **Resume routine**. Shortcut metadata intentionally contains no habit,
focus, Capture, or routine text.

All widgets and shortcuts must still be checked across representative launchers because layout,
font scaling, ordering, and refresh timing vary.
