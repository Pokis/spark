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

Expected for SQLCipher, Play Billing, or the Android widget. Build Spark's development client:

```powershell
npm.cmd run android
```

Then use:

```powershell
npx.cmd expo start --dev-client
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
