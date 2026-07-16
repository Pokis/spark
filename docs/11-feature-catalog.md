# Spark feature catalog

Updated: **2026-07-16**

This is the authoritative catalog of implemented Spark behavior. It explains what each feature
does, why Spark uses that approach for ADHD support, where data lives, whether cloud services are
required, and any release or platform note.

Unless a row explicitly says otherwise, the feature is implemented in the mobile application,
works without an account, stores its state on the device, and creates no Google Cloud runtime
cost.

## Product boundary

Spark is an offline-first wellness and productivity tool. It is not a medical device, diagnostic
tool, treatment, crisis service, social network, or behavior-surveillance product.

The core strategy is **flexible consistency**:

- completed actions remain completed forever;
- blank days do not reset progress or receive failure labels;
- every habit has several valid sizes;
- invitations can be deferred, resized, paused, or ignored without punishment;
- recommendations adapt presentation to current capacity instead of increasing pressure;
- rewards are fixed and visible, never randomized;
- the useful product does not require an account, subscription, or server.

## Onboarding and first use

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Guided onboarding | Introduces no-guilt language, flexible habit sizes, privacy boundaries, sensory controls, and optional notifications before the main tabs. | Local settings; no cloud. |
| Starter habits | Seeds editable examples so the user can act before designing a system from scratch. | Encrypted SQLite. |
| Starter routines | Seeds literal, one-step-at-a-time transition support. | Encrypted SQLite. |
| Optional display name | Personalizes Today without requiring identity or an account. | Local setting only. |
| Minimum viable day | Reduces Today to one intentionally tiny action. It can be enabled from Today or Settings and does not lower rewards after the fact. | Local setting only. |

## Today: choosing and starting

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Capacity check-in | Empty, steady, or ready capacity changes the maximum recommended habit size. High available time never overrides low capacity. | Daily local check-in. |
| Time-room check-in | Offers 2, 5, 10, 20 minutes, or no clock. It filters feasible actions without treating unavailable time as failure. | Daily local check-in. |
| Context check-in | Home, work, outside, or phone helps rank eligible habits. | Daily local check-in. |
| Compact remembered check-in | Once capacity and time are chosen, the controls collapse to a short editable summary so actions reach the top faster. | Local UI state plus daily check-in. |
| Same as yesterday | Copies yesterday’s capacity, time, and context with one explicit action. | Local database only. |
| Time-of-day context memory | Optionally remembers common morning, afternoon, and evening contexts. No location permission or server is used. | Local settings only. |
| Short recommendation menu | Scheduling, pauses, capacity, time, context, priority, and recent activity produce at most a few visible invitations. | Shared local domain logic. |
| Pick for me | Deterministically chooses one already-eligible Today action and explains why it fit. It changes presentation, not points or eligibility. | No additional persisted data. |
| Direct tiny completion | Every suggestion exposes a visibly labeled **Log tiny** action. The label makes it clear that a completion will be created. | Local completion. |
| Two-minute launch | Opens Focus with the habit action and two-minute duration prefilled. | Local navigation; focus session is persisted when started. |
| Start with recommended timer | Habit actions can open Focus with title and duration already filled in. | Local only. |
| Neutral deferral | **Not now**, **Later today**, **Tomorrow**, and **Quiet today** temporarily remove an invitation without creating a completion, failure, pause, or rhythm penalty. | Local deferral table; included in backups. |
| Return card | After several blank days, offers a previously successful tiny action as a quiet return. It does not summarize missed days. | Derived locally from history. |
| Rescue my day | Switches Today into the minimum-viable one-action mode. | Local setting only. |
| Enough state | When nothing is eligible, Spark says there is nothing overdue and explicitly permits rest. | Derived locally. |

## Completion trust and feedback

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Explicit completion semantics | Widget and notification labels say **Log tiny win**. The widget opens a confirmation screen before writing. | No silent writes. |
| Rapid-tap guard | A per-habit/variant lock rejects duplicate taps inside a 1.5-second window, while other actions remain usable. | In-memory guard plus button busy state. |
| Saving state | Completion buttons become disabled and expose accessibility busy/disabled state while saving. | UI state only. |
| Accessible undo | The latest completion shows a live-region message and a labeled Undo control with no short auto-expiry. | Deletes the local completion if chosen. |
| Fixed Spark rewards | Tiny, standard, and stretch rewards are deterministic and disclosed before completion. Reward display can be disabled. | Local completion and materialized totals. |
| Sensory profiles | Calm, balanced, and celebratory profiles control motion intensity and haptic behavior. | Local setting only. |
| Celebration styles | Supporters can choose burst, ripple, or confetti-style local feedback. | Cosmetic local setting. |
| Optional completion tags | Timer helped, made it tiny, body double, and good cue can be added with one tap during celebration or later in history. Journaling is not required. | Stored on the completion; backup/CSV included. |

## Habits and flexible consistency

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Three valid sizes | Tiny, standard, and stretch versions each count as a real completion. | Encrypted SQLite. |
| Starter templates | Reading, movement, and space-reset templates reduce blank-form work. | Local editor presets. |
| Tiny suggestion helper | Suggests a literal first physical step from common habit wording. | On-device string rules. |
| Schedules | Daily, selected weekdays, rolling times per week, calendar intervals, and anytime schedules are supported. | Shared domain logic and SQLite. |
| Flexible weekly scheduling | Times-per-week reminders are spread across remaining opportunities instead of becoming a rigid daily obligation. | Local scheduling. |
| Priority and contexts | Help choose among several eligible habits without producing a backlog score. | Local habit fields. |
| Pause and resume | One-day/week pauses and resume-now keep history intact. Pause intervals are excluded from rhythm opportunities. | Current pause plus bounded pause history. |
| Archive | Removes a habit from Today while retaining history. Destructive intent is confirmed. | Local archive timestamp. |
| Habit history | A 28-day calendar and detailed list emphasize completions and pauses. Blank days use a neutral dot, not failure color. | Local completion/history queries. |
| Forgotten-win correction | A user can explicitly add a tiny, standard, or stretch win for today or yesterday. | Local completion with source `history`. |
| Accidental-entry correction | Individual completions can be removed after confirmation without marking a failure. | Local deletion. |
| Draft preservation | New and edited habit form state is debounced into local draft storage and restored after background/process loss. It is cleared after a successful save. | AsyncStorage; no cloud. |
| Color-safe labels | Habit/routine color controls have human-readable accessibility names and selected check marks; state is not communicated by color alone. | UI/accessibility only. |

## Reminders

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Local notifications | Scheduled entirely by the device. No push-token server is required. | OS notification scheduler. |
| Exact or flexible windows | A reminder can use an exact time, morning, afternoon, or evening. Window reminders use a small deterministic spread to avoid every habit firing together. | Local habit field. |
| Occurrence-aware planning | Already completed, paused, archived, or unscheduled occurrences are not reminded. | Local domain logic. |
| Notification cap | Limits how many habits can produce upcoming reminders; higher-priority habits are chosen first. | Local setting. |
| Configurable snooze | Later actions can use 5, 15, 30, or 60 minutes. | Local setting. |
| Log tiny win action | Creates only the explicit tiny completion from the notification action. | Local completion. |
| Quiet today action | Suppresses the habit for the remainder of the day without changing history. | Local deferral. |
| Automatic quieting | After three unanswered planned invitations, that habit’s reminders rest for three days. Progress is untouched. | Local AsyncStorage state. |
| Reminder preview | Habit editor shows exact wording, timing/window, sensory behavior, and actions before permission is needed. | No notification permission required. |
| Permission restraint | Spark requests notification permission only after the user enables notifications. | OS permission; no cloud. |

## Focus and body doubling

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Restart-safe timer | The active focus session is written immediately. Elapsed time is calculated from timestamps, so backgrounding or process restart does not erase it. | Encrypted SQLite. |
| Prefilled launches | Habits, routine steps, and Capture items can provide a title and duration through local navigation. | Local only. |
| Two-minute launch | Always available even when remote-configured duration presets do not include two minutes. | Local only. |
| Optional launch runway | A five-second countdown has explicit Start now and Not yet controls. | Local setting/UI state. |
| Pause/resume/finish early | Paused time is tracked separately. Early finish is represented neutrally. | Local focus session. |
| Park interruptions | Thoughts entered during focus move into Capture and increment an interruption count. | Local SQLite. |
| Transition nudge | After focus, an optional next tiny move can be parked in Capture. | Local setting and Capture item. |
| Planned-versus-actual history | Recent sessions show planned and actual time without a speed grade. | Derived locally. |
| Local companions | Spark, owl, and cloud body doubles change visual company, not core capability. Extra companions are supporter cosmetics. | Local cosmetic setting. |
| Offline soundscapes | Brown, pink, and soft loops are generated as local WAV files, played only during active focus, and have independent 10–75% volume controls and mute. Nothing streams. | Device cache; no server/license runtime. |
| Minimal permissions | Audio recording, microphone access, and background playback are disabled in Expo configuration. Only local foreground playback is used. | Android retains audio-output settings permission only. |
| Draft preservation | Idle focus target, duration, interruption text, and next-move text survive background/process loss. | AsyncStorage. |

## Capture: external memory

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Category-free capture | A thought can be parked without choosing project, priority, due date, or taxonomy. | Encrypted SQLite. |
| Main-form draft | Unsubmitted text is restored after background/process loss and cleared after successful parking. | AsyncStorage. |
| Android Share to Spark | Text and URLs shared from another Android app become local Capture items. | Android share receiver; no server. |
| Quick-capture widget | A small Android home-screen widget opens a focused capture form. | Android widget; no runtime cloud. |
| Local search | Appears once the list is larger and filters active/released text entirely on-device. | In-memory filter. |
| Edit | Captured text can be corrected in place. | Local upsert. |
| Release and undo release | Release moves an item out of the active parking lot; Put back restores it. | Local timestamp update. |
| Delete with immediate undo | Deletion is confirmed and the last deleted item can be restored immediately. | Local delete/reinsert. |
| Multi-select cleanup | Long-press selection supports releasing several parked thoughts together. | UI state and local updates. |
| Convert to habit | Opens the habit editor with the text prefilled. | Local navigation. |
| Convert to focus | Opens a two-minute Focus target with the text prefilled. | Local navigation. |
| Convert to routine step | Opens the routine editor with the first step prefilled. | Local navigation. |

## Routines and transitions

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Editable templates | Leave the house, start work, bedtime landing, and reset after interruption are editable local starting points. | Local presets. |
| Literal visible steps | Running a routine emphasizes one physical next action at a time. | Local routine data. |
| Reordering | Accessible up/down controls reorder steps deterministically. | Local sort order. |
| Edit and duplicate | Existing routines can be changed or copied with new identifiers. | Encrypted SQLite. |
| Archive and restore | Archived routines retain all steps and can be managed from Journey. | Local archive timestamp. |
| Make step tiny | Switches to the optional tiny rescue wording without logging anything. | Saved run state. |
| Skip step | Advances without failure wording and records the skipped step only in the active run state. | Saved run state. |
| Pause routine | Keeps the exact step, tiny state, skipped steps, and start time across app restart. | Routine-run table; backup included. |
| Resume indicator | Journey shows when a routine has a saved position and which step is waiting. | Derived locally. |
| Gentle finish estimate | Sums remaining unskipped estimates and shows an approximate clock time, never a speed score. | Derived locally. |
| Linked habit | A step can open an explicitly linked habit editor/history entry point. | Optional local relationship. |
| Linked focus block | A step can define its own focus duration; every step also offers a two-minute launch fallback. | Optional local field. |
| Draft preservation | New and edited routines, including steps and links, survive process loss until saved. | AsyncStorage. |

## Journey and useful progress

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| No-reset rhythms | Rolling opportunities and active days replace fragile streak resets. | Shared local domain logic. |
| Comeback recognition | Returning after a gap is described positively; several wins on one day do not fake several active days. | Derived locally. |
| Fourteen-day activity | Shows completed actions and active days. Blank days are not red or labeled missed. | Materialized local summaries. |
| Weekly reflection | Summarizes attention and useful tiny sizes without a deficit score. | Derived locally. |
| Supportive observations | Can note frequent tiny use, helpful context, and better-fitting focus durations. Requires enough local evidence. | On-device derivation only. |
| Hide or disable observations | Each observation can be hidden; all observations can be disabled; hidden observations can be restored in Settings. | Local settings. |
| Optional points/percentages | Spark totals, levels, and rhythm percentages can each be hidden when they create pressure. | Local settings. |

## Sensory, visual, and accessibility behavior

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Dark/light system theme | Follows device appearance. | Device setting. |
| High contrast | Replaces subtle surfaces with strong text and borders. | Local setting. |
| Reduced motion | Stops companion pulsing, calms celebrations, and makes navigation transitions instant. | Local setting. |
| In-settings feedback preview | Calm, balanced, and celebratory profiles can be inspected without creating a completion. | UI only. |
| Large text/narrow layouts | Cards scroll, chip/button labels wrap or shrink, routine runner remains scrollable, and actions use wrapping rows. | UI only; final device QA still required. |
| Touch targets and semantics | Primary controls use minimum heights, labels, roles, selected/checked state, busy/disabled state, and live regions. | Accessibility metadata. |
| Button states | Pressed, disabled, and loading states are consistent; loading exposes text plus a progress indicator. | UI only. |
| Loading skeleton | Initial local-data loading uses static structural placeholders, not a decorative or endless animation. | UI only. |
| Color independence | Selection check marks, icons, wording, borders, and accessible names supplement color. | UI only. |

## Supporter monetization

The free product includes unlimited habits, all habit sizes, Today recommendations, reminders,
focus, Capture, routines, history correction, basic insights, accessibility, deletion, and
backup/restore.

Supporter access may be obtained from a verified store purchase, official promo code, or explicit
admin grant. The owner can grant or revoke an entitlement through the optional dashboard.

Implemented supporter comfort/cosmetic options:

- Aurora, Ocean, and Forest accent themes;
- supporter badge visibility;
- Spark, owl, and cloud companion choices;
- burst, ripple, and confetti celebration choices;
- local offline soundscape selection and volume;
- classic, calm, and midnight in-app/widget icon treatments;
- build-time Android/iOS launcher icon treatment through `SPARK_ICON_VARIANT=classic|calm|midnight`.

The `calm` and `midnight` launcher treatments currently share the v2 foreground art and use
different Android adaptive-icon backgrounds. Dynamic launcher-icon switching is intentionally not
used because it would add native activity aliases and device-specific fragility. In-app and widget
treatments update immediately.

If supporter access is not active, the app safely falls back to the standard theme, Spark
companion, burst celebration, and muted soundscape.

## Local data, backups, and reliability

| Feature | Implementation | Notes |
| --- | --- | --- |
| Encrypted database | SQLCipher-backed Expo SQLite in native builds. Spark refuses private-data use in a native build when encryption cannot be verified. | Expo Go is explicitly labeled an unencrypted preview. |
| Current database schema | Version 5 with forward migrations for every released version. | Migration manifest is tested as contiguous. |
| Migration safety copies | Before a database migration, Spark creates an encrypted database copy and retains at most three. | Skipped in Expo Go preview. |
| Restore safety copies | Before JSON restore, Spark writes a private local JSON safety copy and retains at most three. | User can delete all automatic safety copies in Settings. |
| SQLite integrity check | `PRAGMA quick_check` runs after migration/open and is shown as a plain-language diagnostics result. | Failure is visible in Settings. |
| Versioned JSON backup | Schema 3 validates IDs, dates, references, pauses, linked habits, deferrals, routine run state, settings, tags, and contexts. | Maximum imported size is 10 MB. |
| Legacy backup migration | Backup schemas 1 and 2 migrate into schema 3 with safe defaults. | Automated tests cover every released backup schema. |
| Portable CSV | Exports habit and completion history, including context and completion tags. | Spreadsheet-formula prefixes are neutralized. |
| Restore preview | Shows file name and entity counts before confirmation. | Current data is replaced only after explicit confirmation. |
| Draft storage | Habit, routine, focus, main Capture, and quick-capture unfinished text/state is debounced locally. | Cleared after successful submission. |
| Materialized progress | Long histories use totals and daily summaries rather than loading every completion for the normal app shell. | Habit history queries are bounded. |

### Local schema inventory

- `habits` and `habit_variants`
- `completions`, including context and optional tags
- `focus_sessions`
- `capture_items`
- `routines` and `routine_steps`, including habit/focus links
- `daily_checkins`, including context
- `habit_deferrals`
- `routine_runs`
- `settings`
- `entitlement`
- `meta`

All of these user-facing local entities are represented in JSON export/import where appropriate.

## Android integrations

| Integration | Behavior | Release note |
| --- | --- | --- |
| Today widget | Displays one eligible action and a clearly labeled Log tiny entry point. Opening it requires confirmation before logging. | Native development/release build required. |
| Quick Capture widget | Opens the minimal quick-capture route. | Native development/release build required. |
| Share target | Receives shared text/URLs into Capture. | Android is enabled first; no storage/contact/location permission. |
| Local notifications | Schedules occurrence-aware reminders and actions. | Native development build needed for reliable action QA. |
| Haptics | Optional foreground completion feedback. | Uses device haptic capability. |
| Offline audio | Foreground-only local WAV playback. | Microphone, recording, and background playback are disabled. |

Expo Go remains useful for ordinary screen work but cannot accurately validate SQLCipher, Android
widgets, notification actions, the share receiver, in-app purchases, or the final native manifest.

## Optional cloud and admin features

These features do not receive habit content, completion history, focus text, Capture text, routine
text, or daily check-ins.

| Feature | Cloud purpose | Cost control |
| --- | --- | --- |
| Remote configuration | Global defaults, feature shutdowns, and announcements. | Cached/fallback config; app works with no URL. |
| Private support | User-created asynchronous support conversations. | Anonymous identity created only when used; bounded payloads and retention. |
| Purchase verification | Verifies Google Play ownership, acknowledgement, restore, RTDN, and revocation. | Cloud Run min 0/max 2; no subscription required for free app. |
| Entitlement grants | Owner/admin can grant or revoke supporter access for a user. | Small Firestore records. |
| Promo inventory | Imports and assigns official Play promo codes. | No custom redemption secret stored in app. |
| Admin roles | Support, content, and owner access boundaries. | Server-enforced roles and audit reasons. |
| Admin dashboard | Support inbox, user lookup, grants, configuration, promo inventory, and audits. | Static Firebase Hosting plus API calls. |

An offline-only user cannot be reviewed, chatted with, or remotely granted access because no cloud
identity exists. To receive a grant or support reply, the user must deliberately enable/use an
optional cloud feature and provide the resulting support identity.

## Intentionally not implemented

These remain deliberately deferred because they add cost, privacy risk, compulsive mechanics, or
permissions disproportionate to current value:

- automatic AI coaching;
- cloud habit synchronization;
- social feeds, public leaderboards, or stranger accountability;
- location tracking;
- app blocking or accessibility-service control;
- random rewards, streak insurance, or loss-framed notifications;
- mandatory analytics, advertising SDKs, or session replay;
- microphone recording;
- health-platform data access;
- background sound streaming.

## Automated coverage

The repository includes focused checks for:

- schedule, interval, pause, comeback, reward, timezone, and DST behavior;
- Today recommendation sizing;
- supportive insight derivation;
- preferred reminder times, reminder windows, pause exclusions, and weekly spreading;
- rapid duplicate-completion guarding;
- disabled completion controls and direct tiny/focus/deferral actions;
- current and legacy backup schemas, reference validation, context, and routine recovery state;
- contiguous database migration versions;
- capacity and settings accessibility components;
- optional API/admin behavior in their respective workspaces.

Native Android QA is still required for widgets, share receiving, notification actions, haptics,
audio output, SQLCipher verification, Play Billing, large-text rendering on representative devices,
and routine recovery after the operating system kills the process.

## Source map

| Area | Main implementation |
| --- | --- |
| Shared recommendation/progress logic | `packages/domain/src/` |
| Local schema, migrations, integrity, export/import | `apps/mobile/src/data/database.ts` |
| Backup validation and safety copies | `apps/mobile/src/services/backup.ts` |
| Today and Journey | `apps/mobile/app/(tabs)/index.tsx`, `journey.tsx` |
| Focus and soundscape | `apps/mobile/app/(tabs)/focus.tsx`, `src/services/soundscapes.ts` |
| Capture and Android share | `apps/mobile/app/(tabs)/capture.tsx`, `src/state/SparkProvider.tsx` |
| Habit editing/history | `src/components/HabitEditor.tsx`, `app/habit/[id]/history.tsx` |
| Routine editing/running | `src/components/RoutineEditor.tsx`, `app/routine/[id].tsx` |
| Notifications | `apps/mobile/src/services/notifications.ts` |
| Android widgets | `apps/mobile/src/widgets/`, `apps/mobile/app.config.ts` |
| Sensory/accessibility theme | `apps/mobile/src/theme.ts`, `src/components/` |
| Optional cloud/admin | `services/control-plane/`, `apps/admin/` |

