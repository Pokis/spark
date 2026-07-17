# Start here

You do not need previous mobile-development experience to run Spark.

## What is already separated for you

1. **The mobile app** works locally without Firebase or Google Cloud.
2. **The cloud control plane** is optional. Do not deploy it until you want support chat or
   verified premium entitlements.
3. **The admin dashboard** is optional and is not needed to build or test habits.

## First run on Windows

Open PowerShell in this folder and run:

```powershell
.\spark.cmd install
.\spark.cmd doctor
.\spark.cmd start
```

For native Android development, use the guided setup and launch commands:

```powershell
.\spark.cmd
.\spark.cmd setup-android -Persist
.\spark.cmd android -Select
```

Every helper command explains its parameters with `-Help`, for example
`.\spark.cmd test -Help`, `.\spark.cmd release -Help`, or `.\spark.cmd deploy -Help`.

PowerShell on this machine may block `npm.ps1`; using `npm.cmd` avoids that problem.

The Expo terminal will show ways to open the app. For a production-style Android
development build, first install Android Studio by following
[docs/01-windows-setup.md](./docs/01-windows-setup.md).

## The five commands you will use most

```powershell
.\spark.cmd doctor                  # Explains anything missing on your computer
.\spark.cmd start                   # Starts the installed development client
.\spark.cmd android -Select         # Builds/runs on a selected Android device
.\spark.cmd test                    # Runs the automated test suite once
.\spark.cmd release -Action Inspect # Shows release identity/readiness without network access
```

When you are ready for Google Play, the upload-ready icon, feature graphic, six phone
screenshots, English/Lithuanian listing copy, and declaration worksheet are grouped in
[`store/android/README.md`](./store/android/README.md). Regenerate and validate the images with:

```powershell
.\spark.cmd release -Action Assets
```

This command is local-only and does not deploy or create a cloud bill.

Choose the path that matches what you are doing:

- First local run: [Windows setup](./docs/01-windows-setup.md), then
  [run the mobile app](./docs/02-run-mobile.md).
- Testing: [testing guide](./docs/testing.md).
- Android release: [Android release](./docs/03-android-release.md), then the
  [release checklist](./docs/release-checklist.md).
- Optional cloud: read [costed features and switches](./docs/08-cost-controls.md)
  before [Google Cloud setup](./docs/04-google-cloud.md).

When you reach either later path, the local starting points are
`.\spark.cmd release -Help` and `.\spark.cmd deploy -Action Status`. Cloud status is read-only,
and Spark does not deploy cloud resources merely because you run or release the offline app.

The purpose-based map for every document is [docs/README.md](./docs/README.md).

The app requires no server for habits, reminders, focus sessions, routines, widgets, or
backups. Before a public release, also read the
[privacy and Play policy guide](./docs/09-data-privacy-and-play-policy.md) and run the
[release checklist](./docs/release-checklist.md). For a detailed explanation of every implemented
feature, ADHD-support strategy, data boundary, and caveat, read the
[feature catalog](./docs/11-feature-catalog.md). The original polish rationale is retained in the
[completed experience roadmap](./docs/10-experience-roadmap.md).
