# Testing

## One command

```powershell
npm.cmd run test:ci
```

## Device-level end-to-end test

The Maestro flow covers onboarding, habit creation, a tiny completion and reward, brain-dump
capture, a focus session, and persistence after the app process restarts:

```powershell
npm.cmd run e2e:android
```

It requires:

1. a running Android emulator or connected device
2. a Spark development/preview build installed on it
3. the free [Maestro CLI](https://docs.maestro.dev/getting-started/installing-maestro)

Maestro's CLI is intended for macOS/Linux. On Windows, run it in WSL with Android `adb`
connectivity, or run the same YAML in a Linux CI runner connected to an emulator. The test lives
at `apps/mobile/e2e/maestro/full-offline-flow.yaml`.

Build and install the native app first:

```powershell
npm.cmd run android
```

The end-to-end test deliberately runs without Firebase or the Spark API. It verifies the
zero-cloud-cost path.

This runs:

- pure domain tests
- mobile component tests
- control-plane API tests with in-memory dependencies
- dashboard component tests

Run static checks:

```powershell
npm.cmd run typecheck
```

Build shared packages, API, dashboard, and the Android JavaScript bundle:

```powershell
npm.cmd run build
```

## Android end-to-end tests

Install [Maestro](https://maestro.mobile.dev/) and a Spark native development build. Complete the
onboarding flow test first because it resets app state:

```powershell
maestro test apps/mobile/e2e/onboarding-and-habit.yaml
maestro test apps/mobile/e2e/capture.yaml
maestro test apps/mobile/e2e/focus.yaml
```

Run these on:

- a Pixel emulator
- at least one physical phone
- a Samsung device before public release

Widget behavior must be checked manually across launchers because launcher layout and update
timing vary.

## Manual ADHD-focused scenarios

1. Select Running low and verify only genuinely tiny starts are emphasized.
2. Leave multiple blank days and verify no red failure state or reset appears.
3. Pause a habit and verify existing rhythm remains.
4. Lock the phone during focus, wait, and return; the timestamp should remain correct.
5. Park interruptions during focus and verify they appear in Capture.
6. Increase system font size and enable TalkBack.
7. Enable reduced motion and verify celebration and body double stop pulsing.
8. Deny notifications and verify the app remains useful and does not reprompt aggressively.
9. Export, clear app storage, restore, and compare data.
10. Put the widget on the home screen, complete its tiny action, and verify one completion.

## Cloud security scenarios

- missing token returns 401
- one user cannot read another support thread
- support role cannot grant premium or change roles
- content role cannot read support
- owner grant requires an audit reason
- unknown Play product is rejected
- invalid Play token does not create entitlement
- deleted cloud identity loses support access
- denied Firestore client SDK cannot read any collection
- dashboard origin not in CORS list is rejected

## Purchase testing

Use Play Console internal testing and license tester accounts. Test:

- new purchase
- user cancellation
- pending payment
- network loss after store approval but before verification
- retry and restore
- already-owned response
- refund/revocation process
- official promo redemption
- manual grant and revocation

Do not test by using a real production charge on an owner account if a license-test path is
available.

## Accessibility release gate

Check:

- TalkBack reading order and labels
- 200% text where supported
- touch targets
- contrast
- reduced motion
- no information conveyed only by color
- keyboard navigation in admin dashboard
- visible browser focus
- widget accessibility label
