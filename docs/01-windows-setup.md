# Windows setup

You can edit Spark and use EAS cloud builds without installing the full Android toolchain. Install
Android Studio when you want a local emulator or USB-device build.

## 1. Install the basics

1. Install the current Node.js 24 LTS release from [nodejs.org](https://nodejs.org/).
2. Install [Git for Windows](https://git-scm.com/download/win) if you do not already use Git.
3. Open PowerShell in the Spark folder.
4. Run:

```powershell
npm.cmd install
npm.cmd run doctor
```

Use `npm.cmd`, not `npm`, if PowerShell says script execution is disabled. That invokes the same
npm installation without changing your machine's execution policy.

## 2. Install Android Studio for local builds

1. Download the latest stable [Android Studio](https://developer.android.com/studio).
2. Keep these installer components selected:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device
3. In Android Studio, open **More Actions → SDK Manager**.
4. Install:
   - the newest stable Android SDK Platform
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
   - Android Emulator
   - Android SDK Command-line Tools
5. Open **Device Manager**, create a recent Pixel virtual device with Google Play, and start it.

Expo SDK 57 currently compiles and targets Android API 36 through its native template. Google Play
requires Android 15/API 35 for new apps until August 30, 2026 and has announced Android 16/API 36
for new apps and updates from August 31, 2026. Spark meets that announced level. Always re-check the
[live target API requirement](https://developer.android.com/google/play/requirements/target-sdk)
and [Expo SDK platform table](https://docs.expo.dev/versions/latest/) before release.

## 3. Add Android tools to the current PowerShell session

Android Studio normally installs the SDK under your Windows user profile. In PowerShell:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator"
adb version
```

If `java` is missing, Android Studio includes a Java runtime. Its usual location is under the
Android Studio installation as `jbr`. Set `JAVA_HOME` to that directory and add its `bin`
directory to `Path`. With a standard installation:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java -version
```

To make these variables permanent, use Windows **Edit environment variables for your account**.

## 4. Verify

Restart PowerShell in the repository and run:

```powershell
npm.cmd run doctor
adb devices
```

An emulator should appear as `device`. A physical Android phone needs Developer options and USB
debugging enabled; accept the authorization prompt on the phone.

## iPhone development on Windows

You can write and test most shared code on Windows. A local iOS simulator and local iOS archive
require macOS and Xcode. EAS Build can produce the iOS binary in the cloud after you join the
Apple Developer Program and provide its credentials.
