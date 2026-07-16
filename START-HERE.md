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
npm.cmd install
npm.cmd run doctor
npm.cmd run start
```

PowerShell on this machine may block `npm.ps1`; using `npm.cmd` avoids that problem.

The Expo terminal will show ways to open the app. For a production-style Android
development build, first install Android Studio by following
[docs/01-windows-setup.md](./docs/01-windows-setup.md).

## The five commands you will use most

```powershell
npm.cmd run doctor        # Explains anything missing on your computer
npm.cmd run start         # Starts the mobile development server
npm.cmd run android       # Builds/runs the Android app when Android Studio is installed
npm.cmd run test:ci       # Runs the automated test suite once
npm.cmd run release:check # Checks whether a release is ready
```

Continue with:

1. [Windows setup](./docs/01-windows-setup.md)
2. [Run the mobile app](./docs/02-run-mobile.md)
3. [Android release](./docs/03-android-release.md)
4. [Google Cloud setup](./docs/04-google-cloud.md) only when you want cloud features

The app requires no server for habits, reminders, focus sessions, routines, widgets, or
backups. Before a public release, also read the
[privacy and Play policy guide](./docs/09-data-privacy-and-play-policy.md) and run the
[release checklist](./docs/release-checklist.md). For a detailed explanation of every implemented
feature, ADHD-support strategy, data boundary, and caveat, read the
[feature catalog](./docs/11-feature-catalog.md). The original polish rationale is retained in the
[completed experience roadmap](./docs/10-experience-roadmap.md).
