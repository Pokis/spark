# Run the mobile app

## Fastest first look

Install dependencies and start Expo:

```powershell
npm.cmd install
npm.cmd run start
```

Expo Go can preview most screens and local notifications, but it does **not** include Spark's
SQLCipher, Android widget, or Play Billing native code. Use it only for a quick UI preview.

## Recommended Android development build

Start an emulator or connect a USB-debuggable phone, then run:

```powershell
npm.cmd run android
```

The first run generates the native Android project, downloads Gradle dependencies, builds a
development client, installs it, and starts the app. It can take several minutes.

For later sessions:

```powershell
npx.cmd expo start --dev-client
```

Then open the already installed Spark development client.

## EAS development build without local Android compilation

Create a free Expo account, install EAS CLI through `npx`, and initialize the project once:

```powershell
npx.cmd eas-cli login
npx.cmd eas-cli init
npx.cmd eas-cli build --platform android --profile development
```

`eas init` writes the Expo project ID used by `app.config.ts`. Download the resulting APK to an
Android phone and run:

```powershell
npx.cmd expo start --dev-client
```

Check current EAS plan quotas before relying on cloud builds. Local Android builds do not consume
EAS build quota.

## What works with no `.env`

- onboarding
- habits and flexible schedules
- Today recommendations and completion celebrations
- rhythms, rewards, focus, capture, and routines
- local reminders
- Android widget in a native build
- backup and restore

Support, admin, and verified purchase buttons remain safely disabled.

## Optional local environment

Copy `.env.example` to `.env` only after deploying the cloud service:

```powershell
Copy-Item .env.example .env
```

Fill the `EXPO_PUBLIC_` values. Never put a service-account key, Play Console credential, private
API secret, or Terraform state in this file.

## Reset test data

Uninstall Spark or clear its storage in Android Settings. This removes the SQLCipher database and
secure key. A JSON backup can be exported first from Spark Settings.

## Add the Android widget

After installing a native build:

1. Long-press an empty area of the Android home screen.
2. Choose **Widgets**.
3. Find **Spark Today**.
4. Drag it to the home screen.

The widget updates when Spark data changes and receives a periodic Android refresh. Tapping its
visible tiny action opens Spark and logs that tiny win.

