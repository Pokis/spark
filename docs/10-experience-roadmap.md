# Spark experience roadmap

Reviewed: **2026-07-16**

Implementation status: **completed in the 2026-07-16 experience pass**, including the Helpful
next layer, sensory/reliability polish, and ethical supporter additions. The items under
**Deliberately defer** remain intentionally excluded. The implementation details, storage
boundaries, cost behavior, and remaining device-QA notes are now tracked in
[11-feature-catalog.md](./11-feature-catalog.md).

Completion summary:

- Recommended next polish sprint: **8 of 8 implemented**.
- Helpful next layer — starting, reminders, progress, Capture, and routines: **implemented**.
- Sensory and visual polish: **implemented in code**, with 200% text/color/device verification
  retained as a manual release gate.
- Reliability polish: **implemented**, including schema-1/2 backup migration tests, contiguous
  database migration coverage, bounded safety copies, integrity checks, and local drafts.
- Ethical supporter additions: **implemented** as cosmetics/comfort; all core executive-function
  support remains free.
- Subsequent assistive expansion: **implemented** in code—Simple mode, Help me now, weekly reset,
  friction planning, departure mode, app lock/privacy controls, encrypted folder backups,
  launcher shortcuts, privacy-safe diagnostics, popular-language support including Lithuanian,
  deliberate progress cards, explicit calendar export, local personal experiments, and an
  Android focus widget.

## Subsequent assistive expansion

The next implementation pass added another local-first layer without changing Spark’s product
boundary:

| Area | Implemented approach |
| --- | --- |
| Lower cognitive load | Simple mode limits Today to one action and keeps only Quick Capture, Focus, Help, and an active routine close by. |
| In-the-moment support | Help me now routes “cannot start,” overwhelm, drifting, remembering, departure, and sensory overload to one relevant action. |
| Weekly planning | Weekly reset stores a short reflection, up to three visible habits, tomorrow context, and a tiny action without missed-day scoring. |
| Friction reduction | Habits can store environment, materials, first contact, obstacle, fallback, and a future-self note. |
| Time blindness | Departure mode works backward from a leave time using a buffer and routine estimate. |
| Privacy | Optional device-authentication lock, recent-app protection, screenshot protection on Android, and three notification-privacy levels. |
| Recovery | Password/recovery-code AES-256-GCM backups and bounded automatic Android folder backups. |
| Fast entry | Four launcher shortcuts plus a timestamp-derived Focus widget with pause/resume controls. |
| Self-knowledge | User-created one-week experiments compare local before/during counts neutrally. |
| Safe sharing | Only user-selected wins become an image/text share; no account connection or automatic reports. |
| Calendar | Spark can hand one focus/departure block to the system calendar without reading calendars. |
| Localization | Bundled selection for 15 languages, including English and Lithuanian; untranslated legacy strings fall back to English. |
| Diagnostics/performance | Content-redacted local diagnostics and a packaged Android startup Baseline Profile. |

All rows above have zero Spark cloud runtime cost. Native integrations still require the
real-device checks listed in the feature catalog and testing guide.

This was the product backlog after the release-readiness review. It favored improvements that
make Spark calmer, faster, clearer, and more useful without adding a server, sensitive
permissions, compulsive engagement, or a large maintenance burden.

## Recommended next polish sprint

These are the highest-value improvements. They are all local-first and require no cloud runtime.

| Priority | Improvement | Why it matters | Size |
| --- | --- | --- | --- |
| 1 | Explicit widget action | The earlier widget said **Open** but immediately logged the tiny action. The implemented flow now says **Log tiny** and requires confirmation, with an open-only choice. Trust matters more than one-tap speed. | Small |
| 2 | Completion tap guard | Disable a completion action while it is saving and ignore rapid duplicate taps. Show one accessible undo message with enough time to act. | Small |
| 3 | Compact remembered check-in | Remember the last context and offer **Same as yesterday**. Once capacity/time are chosen, collapse them into a small editable summary so Today reaches the actual actions sooner. | Small–medium |
| 4 | Neutral deferral | Add **Not now**, **Later today**, and **Tomorrow** to a suggestion. This should hide or reschedule the invitation without recording failure, pausing the habit, or changing its rhythm. | Medium |
| 5 | Start focus from a habit | Add **Start with a timer** beside a suggested action. Open Focus with the habit and recommended duration already filled in. | Small |
| 6 | Habit history and correction | Let a user see recent completions for one habit, remove an accidental entry, or log a forgotten action for today/yesterday. Use neutral language such as **Add a win I forgot to log**. | Medium |
| 7 | Editable routines | Allow editing, duplicating, reordering, archiving, and restoring routines. Persist the active step so a phone restart does not lose the transition. | Medium |
| 8 | Capture cleanup | Add edit, delete, undo release, and optional multi-select cleanup. Keep capture category-free by default. | Small–medium |

### Acceptance rules for this sprint

- No new account or server is required.
- Every destructive action has undo or confirmation.
- Nothing creates a completion without an explicit label that says it will log one.
- Blank, deferred, or resized actions do not produce red or failure language.
- New controls work with TalkBack, large text, reduced motion, and keyboard navigation where
  relevant.
- New data fields are included in backup validation, migration, export, and restore tests.

## Helpful next layer

### Make starting easier

- **Pick for me:** choose one of the already eligible Today actions. This changes presentation,
  not reward value, and should explain why it was chosen.
- **Make this smaller:** expose the tiny version directly on every action without first opening
  the full option list.
- **Two-minute launch:** begin a short focus block from any habit or routine step.
- **Return card:** after several blank days, show one quiet invitation based on a previously
  successful tiny action—not a missed-day summary.
- **Default contexts:** optionally remember common context by time of day, entirely on-device.

### Make reminders feel less brittle

- Let users choose a window such as **morning**, **afternoon**, or **evening**, not only an exact
  clock time.
- Offer configurable snooze choices instead of the earlier fixed 15 minutes.
- Add **Quiet for today** from the notification and in-app action card.
- Show a local reminder preview so wording, haptic level, and timing are understandable before
  permission is requested.
- Keep reminder caps and automatic quieting; do not add engagement or “you are falling behind”
  notifications.

### Make progress useful without grading

- Show on-device observations such as:
  - “Tiny was the useful size most often this week.”
  - “This habit usually fits on work days.”
  - “Five-minute focus blocks were easier to finish than twenty-five-minute blocks.”
- Let the user hide each observation and disable insights completely.
- Add a per-habit calendar/list that emphasizes completed actions and pauses, without coloring
  blank days as failures.
- Add optional one-tap completion tags such as **timer helped**, **made it tiny**, **body double**,
  or **good cue**. Avoid mandatory journaling.

### Make Capture genuinely frictionless

- Add Android **Share to Spark** so selected text from another app can be parked locally.
- Add a small quick-capture widget or launcher shortcut.
- Allow a capture item to become a focus target or routine step, not only a habit.
- Add optional local search after the list becomes large.

### Make routines more supportive

- Bundle editable templates such as **leave the house**, **start work**, **bedtime landing**, and
  **reset after interruption**.
- Add **Skip this step**, **Make step tiny**, and **Pause routine** without losing the current
  position.
- Offer a gentle estimated finish time, never a speed score.
- Allow a routine step to open a linked habit or short focus block.

## Sensory and visual polish

- Add an in-settings preview for calm, balanced, and celebratory feedback.
- Use subtle screen transitions that become instant when reduced motion is enabled.
- Improve pressed, disabled, loading, success, and offline states consistently across every
  button.
- Add skeletons only where data loading is noticeable; avoid decorative waiting animations.
- Verify all cards at 200% text and narrow screen widths.
- Add color-blind-safe theme checks and never rely on color alone.
- Consider a small licensed offline sound pack with independent volume and a clear mute control.
  Do not stream audio or require a subscription for focus.

## Reliability polish

- Keep the last few automatic local safety snapshots around migrations and restores, with bounded
  storage and a clear delete control.
- Run a lightweight SQLite integrity check after migrations and expose a plain-language result in
  diagnostics.
- Add migration tests that open backups/databases from every released schema version.
- Preserve unfinished form text when the app backgrounds or Android reclaims the process.
- Add focused tests for timezone/DST changes, reminder actions, rapid completion taps, widget
  actions, and routine restart recovery.

## Supporter features that remain ethical

Good paid additions are cosmetic or comfort-oriented:

- extra color themes and app icons;
- additional local body-double companions;
- licensed offline soundscapes;
- alternate celebration styles;
- supporter badge visibility controls.

Do not charge for habit limits, tiny versions, reminders, backup/restore, accessibility, focus,
capture, routines, deletion, or basic progress understanding.

## Deliberately defer

These add cost, privacy risk, permissions, or product complexity disproportionate to current
value:

- automatic AI coaching;
- cloud habit synchronization;
- social feeds, accountability strangers, or public leaderboards;
- location tracking;
- app blocking or accessibility-service control;
- variable rewards, streak insurance, or loss-framed notifications;
- mandatory analytics or third-party session replay.

## Historical implementation order

1. Widget semantics and duplicate-tap protection.
2. Remembered/collapsible Today check-in and neutral deferral.
3. Start Focus from a habit.
4. Habit history/correction and Capture editing.
5. Routine edit/reorder/restart recovery.
6. Reminder windows and quiet-for-today.
7. On-device supportive insights.
8. Share-to-Spark, extra widgets, soundscapes, and supporter cosmetics.

This order improves trust and daily friction first. It does not require deploying Google Cloud.

## Time-sensitive platform facts checked

- Expo SDK 57 currently uses React Native 0.86 and Android compile/target SDK 36:
  [Expo SDK reference](https://docs.expo.dev/versions/latest/).
- Google Play currently requires new apps and updates to target Android 15/API 35 or higher:
  [target API requirement](https://developer.android.com/google/play/requirements/target-sdk).
- Play requires an accurate Health apps declaration for closed, open, and production tracks:
  [Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291).
