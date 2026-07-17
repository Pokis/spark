# PowerShell command helper

Spark includes a guided Windows command helper so you do not need to remember or copy individual
npm, Expo, Java, or `adb` commands.

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
