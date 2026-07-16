# iPhone release later

The app is already written with shared React Native screens, domain logic, local database,
SecureStore, local notifications, support, and entitlement interfaces. Android is the first
release because it can be built and published with the account you already have.

Shared iPhone-compatible code now also includes Simple mode, Help me now, weekly reset, friction
plans, Departure mode, explicit system-calendar event creation, selected-win sharing, personal
experiments, Quiet now, Face ID/device-credential app lock, app-switcher snapshot protection,
password-encrypted backup, diagnostics, and the 15-language catalog.

## What can be done now on Windows

- all TypeScript development
- unit and API tests
- Android UI validation
- EAS iOS cloud compilation after credentials exist

## What needs Apple access

- Apple Developer Program membership
- App Store Connect app record
- unique bundle ID
- distribution certificate and provisioning
- App Store non-consumable product
- privacy nutrition labels
- iPhone/iPad screenshots
- TestFlight testing

A local iOS simulator and Xcode debugging require a Mac. EAS can build in the cloud, but difficult
native problems are still easier to diagnose with Xcode.

## iOS build

After joining the program:

```powershell
Set-Location apps/mobile
npx.cmd eas-cli@latest build --platform ios --profile production-ios
Set-Location ..\..
```

EAS will guide credential creation. Do not reuse the Android Play purchase verification endpoint
for Apple receipts.

## Known platform difference

`react-native-android-widget` is Android-only. The mobile app itself runs on iPhone, but the iOS
home-screen widget needs a WidgetKit extension. Add that after the core app has been validated;
it is a native target with its own signing and shared-container considerations.

Automatic backups to a persistent user-selected folder are currently Android-only because they
use Android's Storage Access Framework. iPhone users can still create manual password-encrypted
files through the system share/file UI. Validate a suitable iOS document-provider/background
strategy before promising automatic iPhone backups.

Sensitive-preview protection uses the iOS app-switcher overlay rather than Android's
secure-window screenshot block. Face ID requires the included usage description and must be
tested in a signed development build. Calendar export uses the system create-event UI and should
not request full calendar access.

## Release order

1. Android closed test.
2. Fix cross-platform UI issues found in real use.
3. EAS iOS development build and physical iPhone testing.
4. Implement and test Apple purchase verification.
5. TestFlight.
6. App Store review.
7. iOS widget after the main app is stable.
