# Testing

## One command

```powershell
npm.cmd run test:ci
```

This runs **261 automated tests**: 194 mobile, 26 domain, 25 control-plane API, and 16 admin
dashboard tests.

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

Measured on **2026-07-17**:

| Scope | Statements | Branches | Functions | Lines | Enforced minimum |
| --- | ---: | ---: | ---: | ---: | --- |
| Mobile: every `app/` and `src/` TypeScript/TSX file | 53.62% | 44.60% | 45.33% | 54.90% | 44 / 33 / 35 / 45 |
| Shared domain package | 99.58% | 94.08% | 100% | 99.58% | 98 / 90 / 100 / 98 |
| Control-plane HTTP application (`src/app.ts`) | 88.53% | 78.52% | 97.91% | 88.66% | 85 / 75 / 95 / 85 |
| Admin source, excluding test/bootstrap files | 73.76% | 49.35% | 67.18% | 75.32% | 70 / 45 / 60 / 70 |

The mobile scope deliberately includes every route and large editor, including files that unit
tests do not import. That makes the remaining screen-level gap visible. Core mobile services are
materially higher: local helpers are fully statement-covered, services are 89.10%, backup is
86.98%, notifications are 93.02%, diagnostics are 94.73%, widgets are 92.64%, and
`SparkProvider` is 73.11%.

Coverage is evidence, not a release substitute. Firebase browser sign-in, Android/iOS system
dialogs, SQLCipher in the shipped native binary, launchers/widgets, notification delivery,
biometrics, sound/haptics, Play Billing, process death, and accessibility still require the
manual/device matrices below.

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

Run static checks:

```powershell
npm.cmd run typecheck
```

Build shared packages, API, dashboard, and the Android JavaScript bundle:

```powershell
npm.cmd run build
```

Validate that native generation includes the shortcuts, six widgets, blocked calendar
permissions, and Baseline Profile:

```powershell
Set-Location apps/mobile
npx.cmd expo prebuild --platform android --no-install
Select-String -Path android/app/src/main/AndroidManifest.xml -Pattern "SparkFocus|SparkRoutine|SparkProgress|SparkToolkit|android.app.shortcuts|READ_CALENDAR|WRITE_CALENDAR|READ_MEDIA_IMAGES|allowBackup"
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

1. Select Running low and verify only genuinely tiny starts are emphasized.
2. Leave multiple blank days and verify no red failure state or reset appears.
3. Pause a habit and verify existing rhythm remains.
4. Lock the phone during focus, wait, and return; the timestamp should remain correct.
5. Save interruptions during focus and verify they appear in Capture.
6. Increase system font size and enable TalkBack.
7. Enable reduced motion and verify celebration and body double stop pulsing.
8. Deny notifications and verify the app remains useful and does not reprompt aggressively.
9. Export, clear app storage, restore, and compare data.
10. Put the Today widget on the home screen, tap Log tiny, verify nothing is written before the
    confirmation, then confirm and verify exactly one completion.
11. Rapidly tap a completion and verify only one entry exists and Undo remains accessible.
12. Defer actions with Not now, Later today, Tomorrow, and Quiet today; verify no completion or
    failure state is created.
13. Start Focus from a habit, routine step, and Capture item and verify title/duration prefilling.
14. Pause a routine, force-stop Spark, reopen it, and verify the exact step/tiny/skipped state.
15. Share text from a browser into Spark and verify it appears only in local Capture.
16. Add the Quick Capture widget and verify unfinished text survives background/process loss.
17. Test exact/morning/afternoon/evening reminders, configurable snooze, Log tiny, and Quiet today.
18. Enable each local soundscape, change volume, lock/unlock, and confirm Spark never requests the
    microphone and does not keep background playback alive.
19. Turn on Simple mode and verify Today shows one action plus Quick Capture, Focus, Help, and only
    the currently running routine; turn it off and verify Journey returns without data loss.
20. Use Help me now for all six barriers and verify every action is local, reversible, and
    pressure-free.
21. Complete Weekly reset, advance the device date, and verify the chosen context/tiny action is
    presented first without marking other habits missed.
22. Add every friction-toolkit field, restart Spark, and verify the expanded Today card shows only
    the useful first/setup/fallback note.
23. Create a Departure plan, add a buffer/routine, and confirm the calculated runway. Export it to
    the calendar and verify Spark never requests calendar permission or lists existing events.
24. Export an idle Focus block to the calendar and verify the system create-event screen is the
    only calendar interaction.
25. Turn on Quiet now while Focus sound is playing. Verify sound, haptics, companion/navigation
    motion, celebrations, reward overlay, and reminder vibration stop until tomorrow.
26. Test notification visibility in all three modes with the phone locked.
27. Turn on app lock, background past each timeout, and test fingerprint/face and device
    credential fallback. Remove enrolled authentication and verify Spark cannot trap the user.
28. Enable sensitive-preview protection. Verify Android recent-app preview and screenshots are
    protected; verify iOS app-switcher protection separately before an iPhone release.
29. Create a password-encrypted backup, alter one byte, and verify restore fails. Restore the
    original with the correct password and verify wrong passwords never replace data.
30. Configure automatic folder backup, verify a daily encrypted file appears, run Back up now,
    and verify only the seven newest Spark automatic files are retained.
31. Select a few completed actions and share PNG/text. Verify unselected actions never appear and no recipient or
    account is remembered.
32. Run each personal experiment, verify the tiny/reminder behavior is applied only during its
    date window, and check that the comparison language stays neutral.
33. Add the Focus widget, start/pause/resume/finish a session from app and widget, force-stop the
    process, and verify timestamp-derived state remains correct. Test the four launcher shortcuts.
34. Add the Progress widget and confirm lifetime wins, fixed points, and today’s count update after
    logging; tapping it must open Progress without writing data.
35. Add the Toolkit widget and verify Capture, two-minute Focus, Departure, and Help each open the
    labeled destination. Test narrow/wide resizing and 200% font/display scaling.
36. Add the Routine widget. Verify its current step and paused state survive restart, its empty
    state opens routine creation, and tapping it never advances or completes a step.
37. In Settings and Progress, collapse and expand every group. Confirm summaries stay meaningful,
    controls keep their values, and larger text never clips add-habit/add-routine buttons.
38. Open every feature tutorial. Verify Close returns without dismissal while preserving the
    tutorial catalog's expanded groups and scroll position. Verify Dismiss hides its
    contextual prompt, Replay remains available, Restore all tips makes prompts eligible again,
    and the first-use prompt can disappear immediately. Complete the Home-screen widgets guide
    and confirm its last page shows Done rather than another Next button.
39. Open nested screens from Today, Progress, Settings, a widget, and a cold deep link. Back must
    return to the actual prior screen when one exists and to the documented fallback otherwise.
40. Switch through all 19 bundled languages, including Lithuanian, Dutch, Turkish, Indonesian,
    Vietnamese, and an RTL Arabic device. Verify navigation and essential Today/Focus/Capture/
    Progress actions change language, dates and times use the locale, no label becomes blank, and
    advanced copy falls back to English. In a fresh native build on Android 13+, also confirm the
    same locale list appears under **App info → Language**.
41. Export diagnostics and inspect the JSON: no habit, focus, routine, Capture, weekly-reflection,
    departure, experiment-note, display-name, file-path, or content-URI text should appear.

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
