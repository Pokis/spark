# Testing

## One command

```powershell
npm.cmd run test:ci
```

This runs every script, mobile, domain, control-plane, and admin-dashboard test. Use the totals
printed by the command as the current count; the suite grows with the product and the documentation
does not pin a repository-wide number. As of this review, the mobile workspace contains **204
tests in 51 suites**.

The suites cover:

- pure domain scheduling, rhythm, recommendation, and comeback behavior;
- mobile state, components, database/backup, notifications, widgets, calendar, privacy, and
  accessibility;
- control-plane privacy, roles, kill switches, purchases, RTDN, support, and retention;
- dashboard setup, configuration, users/grants, support, promo, audit, and role workflows.

## Coverage gate

Run the repository-wide coverage command before merging or preparing a release candidate:

```powershell
npm.cmd run test:coverage
```

It rebuilds shared packages first, executes every workspace coverage suite, prints per-file
reports, and fails if any workspace falls below its checked-in threshold. Generated reports are
written under ignored `coverage/` folders.

Measured on **2026-07-20**:

| Scope | Statements | Branches | Functions | Lines | Enforced minimum |
| --- | ---: | ---: | ---: | ---: | --- |
| Mobile: every `app/` and `src/` TypeScript/TSX file | 58.14% | 50.36% | 49.11% | 60.34% | 44 / 33 / 35 / 45 |
| Shared domain package | 99.63% | 95.09% | 100% | 99.63% | 98 / 90 / 100 / 98 |
| Control-plane HTTP application (`src/app.ts`) | 88.53% | 78.52% | 97.91% | 88.66% | 85 / 75 / 95 / 85 |
| Admin source, excluding test/bootstrap files | 73.76% | 49.35% | 67.18% | 75.32% | 70 / 45 / 60 / 70 |

The mobile scope deliberately includes every route and large editor, including files that unit
tests do not import. That makes the remaining screen-level gap visible. Core mobile services are
materially higher: local helpers are 99.03% statement-covered, services are 88.97%, backup is
86.98%, notifications are 92.59%, diagnostics are 94.73%, widgets are 86.95%, and
`SparkProvider` is 73.11%.

Coverage is evidence, not a release substitute. Firebase browser sign-in, Android/iOS system
dialogs, SQLCipher in the shipped native binary, launchers/widgets, notification delivery,
biometrics, sound/haptics, Play Billing, process death, and accessibility still require the
manual/device matrices below.

## Device-level end-to-end test

The Maestro flow covers the new two-page onboarding, explicit completion-shifted frequency,
one-action habit completion, Week/Month/Record Calendar, and persistence after process restart:

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

Run static checks:

```powershell
npm.cmd run typecheck
```

Build shared packages, API, dashboard, and the Android JavaScript bundle:

```powershell
npm.cmd run build
```

Validate that native generation includes the shortcuts, seven widgets, blocked calendar
permissions, and Baseline Profile:

```powershell
Set-Location apps/mobile
npx.cmd expo prebuild --platform android --no-install
Select-String -Path android/app/src/main/AndroidManifest.xml -Pattern "SparkCalendar|SparkFocus|SparkRoutine|SparkProgress|SparkToolkit|android.app.shortcuts|READ_CALENDAR|WRITE_CALENDAR|READ_MEDIA_IMAGES|allowBackup"
Test-Path android/app/src/main/baseline-prof.txt
Set-Location ../..
```

`READ_CALENDAR` and `WRITE_CALENDAR` should appear only as `tools:node="remove"`. The calendar
bridge must use system UI without broad calendar access.

## Android end-to-end tests

Install [Maestro](https://maestro.mobile.dev/) and a Spark native development build. The release
suite entry point is:

```powershell
maestro test apps/mobile/e2e/maestro
```

There is one authoritative flow under `apps/mobile/e2e/maestro`; outdated partial flows were
removed so they cannot disagree with the release experience.

Run these on:

- a Pixel emulator
- at least one physical phone
- a Samsung device before public release

Widget behavior must be checked manually across launchers because launcher layout and update
timing vary.

## Manual ADHD-focused scenarios

Run the core scenarios first. These are release blockers for the stakeholder-requested experience:

1. Clear app data. Confirm onboarding has two pages, no sample habits, no point/size lesson, and an
   explicit **Set up later** choice.
2. Enter only a habit name and tap Create. Confirm Spark asks for frequency instead of assuming
   daily.
3. Create one habit for each recurrence: daily, selected weekdays, times per week, fixed interval,
   after completion, and whenever. Confirm only due habits appear on Today.
4. For **After I complete it**, use a three-day interval, complete late, and verify the following
   due date moves three days from the actual completion. Check the reminder moves with it.
5. Create **Take vitamins** with action sizes off. Confirm Today shows one Done button and no size,
   minute, or point copy. Undo it and complete it again.
6. Confirm Today begins with **Up next**, the habit rows, and Calendar access. No energy prompt,
   tutorial card, points card, Focus, Capture, routine, streak, or planning panel should appear.
7. Open Calendar. Check Week, Month, and Record, previous/next periods, scheduled/completed cell
   contrast, per-habit navigation, recent completion history, and an empty state with zero habits.
8. Increase font/display size to 200% and enable TalkBack. Add controls, Done, recurrence radios,
   tabs, month navigation, and each calendar cell must remain reachable and named.
9. Open Settings → Optional features. Enable and disable every switch. Each corresponding surface
   must appear/disappear without deleting stored habits, variants, sessions, routines, or history.
10. Open every **How this works** link. Close, complete, dismiss, and replay guides; the tutorial
    catalog must keep its expanded state and scroll position.
11. Add the 4×4 Habit Calendar widget. Verify two habits fit without clipping on Pixel and Samsung
    launchers, its current-month completions refresh, and tapping opens Calendar without writing.
12. Upgrade an installation containing existing habits. Confirm the schema 8 migration switches
    optional features off, schema 9 archives only the known built-in sample IDs, all user-created
    habits/history remain, and a pre-migration safety copy exists.

Then run the optional-feature and platform scenarios:

13. Enable different action sizes, create all three sizes, and verify size selection; disable the
    feature and confirm the variants remain stored but Today returns to one action.
14. Enable suggestion adjustment and verify energy/time/place changes ordering without changing
    recurrence. Disable it and confirm the panel disappears.
15. Enable streaks; test daily/every-other-day chains, saves, planned breaks, and duplicate wins.
    Disable it and confirm Calendar remains available.
16. Enable Focus and Capture. Test timer restart/pause/resume, interruption capture, share target,
    local draft recovery, soundscapes, and the Focus/Capture widgets.
17. Enable routines and planning. Test routine resume, weekly planning, departure calendar export,
    one-week changes, and deliberate image/text sharing.
18. Add Today, Calendar, Capture, Focus, Routine, Progress, and Toolkit widgets. Test add, resize,
    restart, empty state, deep-link destination, and that taps do not silently create data.
19. Test exact/morning/afternoon/evening reminders, cap, privacy levels, snooze, completion action,
    automatic quieting, and the completion-shifted reminder calculation.
20. Turn on Quiet for today while Focus audio is playing. Verify sound, haptics, motion,
    celebrations, reward overlays, and reminder vibration stop until tomorrow.
21. Export/restore encrypted and CSV backups, tamper with a file, test wrong passwords, and verify
    automatic-folder retention keeps only the seven newest files.
22. Test app lock and sensitive-preview protection with enrolled and removed device credentials.
23. Switch through all 19 bundled languages, including Lithuanian and RTL Arabic. Verify the
    Today/Calendar navigation labels, core actions, dates, and times; advanced untranslated copy
    may fall back to English but may never be blank.
24. Export diagnostics and inspect the JSON: no habit, Focus, routine, Capture, weekly-reflection,
    departure, experiment-note, display-name, file-path, or content-URI text may appear.

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
- the same RTDN message delivered twice
- a purchase token claimed by a different anonymous identity
- explicit Restore transferring the single entitlement

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
- focus-widget pause/resume semantics
- app-lock screen reading order and unlock action
- progress-card selection as checkboxes
- language changes, Lithuanian copy, and RTL device layout

Automated assertions also cover rapid-tap guarding, direct tiny/focus/deferral actions, backup
migration from every released schema, encrypted backup round trips, automatic-backup retention,
portable CSV injection protection, restore safety copies, database migrations/integrity,
provider state transitions, routine recovery data, reminder windows, timezone/DST behavior,
supportive observations, personal-experiment comparison, calendar handoff, focus-widget timestamp
math/actions, Lithuanian localization/fallback, app error recovery, themes, labelled completion
actions, settings, private support/grant/promo/audit/admin flows, and non-judgmental capacity
language. They supplement rather than replace TalkBack and large-text device testing.
