# Troubleshooting

## PowerShell says scripts are disabled

Use:

```powershell
npm.cmd install
npx.cmd expo start
```

Do not change the machine execution policy merely for Spark.

The Google Cloud CLI can have the same symptom. Use `gcloud.cmd` instead of `gcloud` from
PowerShell.

## `adb` or Java is not found

Follow `docs/01-windows-setup.md`, then close and reopen PowerShell. Run:

```powershell
npm.cmd run doctor
adb devices
java -version
```

## Expo Go reports a missing native module

Expected for SQLCipher, Play Billing, widgets, notifications, and other native integrations. The
default Spark QR code uses an `exp+spark-adhd-habits://` address and can only be opened by an
installed Spark development build; scanning it in Expo Go does nothing.

Build and install Spark's development client:

```powershell
.\spark.cmd android -Select
```

For later sessions, use:

```powershell
.\spark.cmd start -Target DevClient
```

Use `.\spark.cmd start -Target ExpoGo` only when a limited, non-authoritative UI preview is useful.

## Android build succeeds but installation stops or is canceled

If the build reaches `Installing ... app-debug.apk` but nothing opens, look for the final ADB error.
If Expo only shows `adb ... install ... exited with non-zero code: 1`, first run:

```powershell
.\spark.cmd devices
```

The chosen phone must appear with state **device**. State **offline**, **unauthorized**, a missing
long `_adb-tls-connect._tcp` ID, or a newly changed Wi-Fi ID means the build succeeded but the ADB
connection disappeared before installation. Unlock the phone, toggle **Wireless debugging**
off/on, or reconnect it in Android Studio Device Manager. Wi-Fi serials can change, so use the new
model/ID printed by `devices` rather than reusing an old copied serial.

`INSTALL_FAILED_USER_RESTRICTED: Install canceled by user` means the phone—not Gradle or Spark—has
blocked development APK installation.

On Xiaomi/Redmi/POCO devices, unlock the phone and open **Settings → Additional settings → Developer
options**. Keep **USB debugging** and **Wireless debugging** enabled, then enable **Install via USB**
and, when present, **USB debugging (Security settings)**. The wording varies by HyperOS/MIUI
version and the security options may require the device owner's Xiaomi account. Accept any install
confirmation shown on the phone.

Reconnect or re-pair wireless debugging if the device disappears, confirm it with:

```powershell
.\spark.cmd devices
```

Then rerun the printed `android -Device ...` command. Keep the terminal open: after installation,
Metro remains running and launches the installed Spark development app.

## Ctrl+C does not stop the development command

Current `spark.cmd start` and `spark.cmd android` launches bypass nested npm shells and explicitly
clean up Expo's Metro/Gradle child processes. Normally one `Ctrl+C` stops the local command. During
a brief Metro startup transition, wait for the QR/status display and press it again.

If the terminal or IDE does not deliver Ctrl+C, open a second PowerShell in the repository and use
the recorded-process fallback:

```powershell
.\spark.cmd stop
```

This validates the recorded Node process ID and start time before terminating its child tree, so a
stale PID file cannot kill an unrelated process. It does not delete app data. The Android app is a
separate device process and may remain visible after Metro stops; close it normally, or explicitly
force-stop it with:

```powershell
.\spark.cmd stop -Device 25113PN0EG
```

## Native build became inconsistent after plugin changes

Regenerate Android native files:

```powershell
npx.cmd expo prebuild --platform android --clean
npm.cmd run android
```

`--clean` deletes and recreates generated native folders. Do not put hand-written code in those
folders unless you also create a config plugin.

## Gradle cannot download dependencies

Check proxy/VPN/firewall access to Maven Central, Google Maven, and Gradle. Retry after confirming
network access. The first build downloads much more than later builds.

## The widget is missing

- use a native build, not Expo Go
- uninstall an older Spark binary before installing a build that first adds the widget
- long-press the home screen and search the widget picker for Spark
- some launchers cache widget metadata; restart the launcher/device
- confirm `react-native-android-widget` is present in `expo config --type public`

## Database opens in Expo Go but is it encrypted?

No. SQLCipher is not included in Expo Go. Encryption is enabled by the Expo config plugin in
native development, preview, and production builds.

## Notifications never appear

- enable Local notifications in Spark Settings
- enable at least one habit's reminder
- inspect Android Settings → Apps → Spark → Notifications
- battery optimization or vendor “sleeping apps” features may delay reminders
- Spark intentionally does not request exact-alarm permission

## Support buttons are disabled

This is correct until `apps/mobile/.env.local` contains an API URL and Firebase mobile config, and
the feature is enabled. Restart Metro after changing it. Core features do not depend on support.

## Dashboard says it is safely offline

Copy `apps/admin/.env.example` to `apps/admin/.env.local`. Restart Vite after editing.

## Dashboard receives 403

The Google account has no effective role. Bootstrap it through `ADMIN_EMAIL_ALLOWLIST`, then use
the Admins page to set a custom claim and sign out/in.

## Cloud Run returns 500 for Play verification

Check:

- Android Publisher API enabled
- Cloud Run service account added to Play Console API access
- package name matches exactly
- product ID is `spark_premium_lifetime`
- the build was installed from a Play test track
- the test account is a license tester

## Firestore asks for an index

Deploy:

```powershell
npx.cmd firebase-tools deploy --only firestore:indexes
```

Index creation can take several minutes.

## Cloud costs appear unexpectedly

Use the emergency procedure in `docs/08-cost-controls.md`. Budgets do not stop charges.
