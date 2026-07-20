# Spark feature catalog

Updated: **2026-07-20**

This is the authoritative catalog of implemented Spark behavior. It explains what each feature
does, why Spark uses that approach for ADHD support, where data lives, whether cloud services are
required, and any release or platform note.

Unless a row explicitly says otherwise, the feature is implemented in the mobile application,
works without an account, stores its state on the device, and creates no Google Cloud runtime
cost.

## Product boundary

Spark is an offline-first wellness and productivity tool. It is not a medical device, diagnostic
tool, treatment, crisis service, social network, or behavior-surveillance product.

The core strategy is **clear, flexible consistency**:

- completed actions remain completed forever;
- blank days do not reset progress or receive failure labels;
- a habit can be a single yes-or-no action; smaller/larger versions are optional;
- every new habit requires an explicit frequency choice instead of silently becoming daily;
- a schedule can follow calendar dates or shift from the day the action was actually completed;
- Today leads with the habit list; context filters and assistive tools appear only when enabled;
- rewards are fixed and visible, never randomized;
- points, streaks, focus, capture, routines, planning, and pattern observations are optional layers;
- the useful product does not require an account, subscription, or server.

## Default experience and feature controls

A fresh installation contains no example habits or routines. Onboarding has two pages: a short
definition, then an optional first-habit form. The initial bottom navigation contains only
**Today** and **Calendar**. This is intentional: the product should not look configured before the
user has configured it.

| Capability | Fresh-install state | User control | Data/cost |
| --- | --- | --- | --- |
| Habit list, explicit schedules, Done, undo, Week/Month/Record calendar | Always present | Core; cannot be hidden | Encrypted local data; $0 |
| Different action sizes | Off | Settings → Optional features | Local setting and habit variants; $0 |
| Energy/time/place suggestion adjustment | Off | Settings → Optional features | Local setting/check-in; $0 |
| Focus tab and shortcuts | Off | Settings → Optional features | Local setting/session data; $0 |
| Quick Capture tab and shortcuts | Off | Settings → Optional features | Local setting/capture data; $0 |
| Step-by-step routines | Off | Settings → Optional features | Local setting/routine data; $0 |
| Reward streaks | Off | Settings → Optional features, then per habit | Local setting/habit metadata; $0 |
| Weekly, departure, one-week-change, and sharing tools | Off | Settings → Optional features | Local setting and records; $0 |
| Points and levels | Off | Settings → Optional features | Display setting; existing rewards remain in local records; $0 |
| Helpful pattern observations | Off | Settings → Optional features | Local calculation only; $0 |

Turning an optional feature off hides its controls and navigation but never deletes the feature's
saved records. Each optional feature has a **How this works** link into a dedicated, replayable
tutorial. None of these switches enables a server or changes the cloud-cost switches described in
[08-cost-controls.md](./08-cost-controls.md).

## Onboarding and first use

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Minimal onboarding | Defines Spark as a habit list and calendar, explains that optional tools begin hidden, and asks only for a habit name and explicit frequency. The user may skip habit creation and arrive at a clear empty state. | Local settings; no cloud. |
| Victory-first interface language | Onboarding, Today, Progress, routines, weekly planning, tutorials, widgets, reminders, and streak cards lead with wins, completed actions, personal bests, and clear next actions. Deferral, pauses, and streak protection use concise mechanical confirmations such as **Scheduled for tomorrow** instead of repeating “nothing lost,” “no missed-day score,” or “gentle restart” reassurance. A source-level regression test protects this vocabulary. | Bundled copy and tests only; no analytics, network, or cloud cost. |
| First-use explanation | The empty Today screen explains the three actual steps—name, frequency, Done—and links directly to habit creation or the schedule guide. It disappears naturally after the first habit; there is no permanent “new here” card. | Derived locally; $0 at every user count. |
| Replayable feature tutorial hub | Sixteen short, step-based guides are grouped by purpose. Core schedules, optional action sizes, adaptive suggestions, Calendar, points, patterns, streaks, Focus, Capture, routines, planning, one-week changes, sharing, widgets, and privacy each have a guide. Close, dismiss, replay, and catalog state preservation remain supported. | Bundled copy and local dismissed-tip IDs only; no CMS, analytics, experimentation platform, or cloud. $0 for 1, 10k, or 1M users. |
| Empty initial database | New installations seed no examples. On upgrade, schema 9 archives the old built-in sample IDs rather than deleting them, so they leave the active list while associated history remains recoverable. User-created data is retained. | Encrypted SQLite; schema 8 settings migration and schema 9 sample archival. |
| Optional display name | Personalizes Today without requiring identity or an account. | Local setting only. |
| One-action and contextual help tools | The previously implemented one-action view and contextual rescue actions remain local assistive tools. They are no longer promoted on the default Today screen; core habit and Calendar navigation always remains visible. | Local setting only. |
| Contextual Help me now | Lets a user name the immediate barrier—cannot start, overwhelmed, drifting, remembering, leaving, or sensory overload—and offers one relevant local action instead of a generic help article. | UI and existing local settings/routes only. |
| Purpose-based, reversible menus | Settings leads with one Optional features card, then independently collapsed reminders, comfort, language, data, and help sections. Today contains the due list first. Calendar separates Week, Month, and Record instead of combining charts, scores, planning, routines, and history in one feed. | Local UI state only; $0 at every user count. |
| Popular-language catalog | Adds system-language selection plus 19 bundled languages: English, Spanish, Brazilian Portuguese, French, German, Italian, Polish, Ukrainian, Russian, Lithuanian, Japanese, Korean, Simplified Chinese, Hindi, Arabic, Dutch, Turkish, Indonesian, and Vietnamese. Navigation, including the renamed Calendar tab, locale-aware dates/times, and essential actions switch immediately. Android/iOS native builds advertise the supported locales, and Arabic enables RTL layout. Advanced copy without a reviewed translation falls back to English instead of becoming blank. | Bundled strings and local settings only: **$0** at 1, 1,000, 10,000, or 100,000 users. No translation API, account, analytics SDK, server, or network request. App bundle growth is the only footprint. |

## Today: choosing and starting

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Schedule-first list | **Up next** shows every habit currently due, in user order. It does not begin with scores, setup prompts, energy questions, or planning cards. | Shared schedule logic and local data. |
| Optional energy/time/place adjustment | When the user enables **Adjust suggestions**, a single collapsed section offers energy, 2/5/10/20-minute availability, and place. These inputs change ordering/size suggestions, never the habit's recurrence. | Daily local check-in; feature off by default. |
| Time-of-day context memory | Optionally remembers common morning, afternoon, and evening contexts. No location permission or server is used. | Local settings only. |
| Explicit Done controls | Every due habit has one prominent **Done** button. The default card shows only icon, name, frequency, and Done. Sizes, points, explanations, and two-minute Focus are shown only when their corresponding optional feature is enabled. | Local completion only after an explicit tap. |
| Two-minute launch | When Focus is enabled, the habit's More options menu can open Focus with the habit and two-minute duration prefilled. | Local navigation; focus session is persisted when started. |
| Start with recommended timer | Habit actions can open Focus with title and duration already filled in. | Local only. |
| Completed and undo state | The most recent completion exposes a persistent Undo row. Other completed habits are grouped in one collapsed **Completed today** section. | Local completion/history state. |
| Clear-list state | A new user sees one setup card. An established user with nothing due sees a single status line plus Calendar access, not an invented backlog. | Derived locally. |
| Weekly visibility plan | Weekly planning selects up to three habits to keep visible and sets up tomorrow’s first action. Selected habits are locally prioritized. | `weekly_plans` local table; backup included. |
| Tomorrow context and tiny action | Weekly reset can name tomorrow’s likely context and one tiny action. The next day, Today uses that context and puts that tiny version first. | Local weekly plan; date-scoped derivation. |

## Completion trust and feedback

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Explicit completion semantics | Widget and notification actions use plain **Done** language. The widget opens a confirmation screen before writing. | No silent writes. |
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
| Simple yes-or-no habits | The default habit has one standard action and one Done button. This fits vitamins, medication reminders, water, or any action that has no meaningful size variants. | Encrypted SQLite. |
| Optional action sizes | A user may add small, regular, and larger versions. All count as the same habit completion. Saving a sized habit also enables the global size UI so the new choices are visible; disabling the UI later does not delete variants. | Encrypted SQLite plus local feature setting. |
| Required schedule choice | The editor does not preselect daily. Save is blocked until the user chooses **Every day**, **Certain days**, **Times each week**, **Every few days**, **After I complete it**, or **Whenever I want**. Frequency sits directly below the name rather than inside advanced settings. | Shared domain logic and SQLite. |
| Completion-shifted recurrence | **After I complete it** calculates the next due date from the latest actual completion. If a three-day habit is completed late on Friday, the next date moves to Monday. The rolling local reminder uses the same rule. | Local completion query and schedule logic; no calendar permission/server. |
| Flexible weekly scheduling | Times-per-week reminders are spread across remaining opportunities instead of becoming a rigid daily obligation. | Local scheduling. |
| Priority and contexts | Help choose among several eligible habits without producing a backlog score. | Local habit fields. |
| Pause and resume | One-day/week pauses and resume-now keep history intact. Pause intervals are excluded from rhythm opportunities. | Current pause plus bounded pause history. |
| Archive | Removes a habit from Today while retaining history. Destructive intent is confirmed. | Local archive timestamp. |
| Habit history | Each habit retains a detailed history/correction route. The main Calendar adds compact Week and Month grids across all active habits plus a Record management view. Blank cells are neutral and scheduled cells use quiet outlines. | Local completion/history queries. |
| Forgotten-win correction | A user can explicitly add a tiny, standard, or stretch win for today or yesterday. | Local completion with source `history`. |
| Accidental-entry correction | Individual completions can be removed after confirmation without marking a failure. | Local deletion. |
| Draft preservation | New and edited habit form state is debounced into local draft storage and restored after background/process loss. It is cleared after a successful save. | AsyncStorage; no cloud. |
| Color-safe labels | Habit/routine color controls have human-readable accessibility names and selected check marks; state is not communicated by color alone. | UI/accessibility only. |
| Friction toolkit | A habit can record environment setup, materials, literal first physical step, likely obstacle, fallback, and a note to future self. The useful starting fields appear inside the expanded Today card and never affect scoring. | `friction_json` in encrypted SQLite; schema validation and backup included. |
| Optional reward-only streak setup | The global streak feature is off initially. When enabled, each habit independently opts in or out and chooses daily or every-other-day periods. Streaks appear only in Calendar → Record, while the normal recurrence schedule still decides Today/reminders. | Internally stored as `momentum_json`; included in validated backups; no cloud. |

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
| Lock-screen privacy levels | The user can show the habit wording, show generic reminder copy, or use Android secret visibility so the reminder is hidden on the lock screen. Separate Android channels preserve the chosen OS visibility. | Local setting and OS notification channels. |
| Sensory-quiet reminder channels | When Quiet now is active, reminders due before tomorrow use no-vibration channels; later reminders retain normal behavior. | Local scheduling only. |

## Focus timer and companion

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Restart-safe timer | The active focus session is written immediately. Elapsed time is calculated from timestamps, so backgrounding or process restart does not erase it. | Encrypted SQLite. |
| Prefilled launches | Habits, routine steps, and Capture items can provide a title and duration through local navigation. | Local only. |
| Two-minute launch | Always available even when remote-configured duration presets do not include two minutes. | Local only. |
| Optional launch runway | A five-second countdown has explicit Start now and Not yet controls. | Local setting/UI state. |
| Pause/resume/finish early | Paused time is tracked separately. Early finish is represented neutrally. | Local focus session. |
| Save interruptions | Thoughts entered during focus move into Capture and increment an interruption count. | Local SQLite. |
| Save the next step | After focus, an optional next tiny move can be saved in Capture. | Local setting and Capture item. |
| Planned-versus-actual history | Recent sessions show planned and actual time without a speed grade. | Derived locally. |
| Local focus companions | Spark, owl, and cloud companions provide optional visual company, using the body-doubling strategy without requiring users to know that term. Extra companions are supporter cosmetics. | Local cosmetic setting. |
| Offline soundscapes | Brown, pink, and soft loops are generated as local WAV files, played only during active focus, and have independent 10–75% volume controls and mute. Nothing streams. | Device cache; no server/license runtime. |
| Minimal permissions | Audio recording, microphone access, and background playback are disabled in Expo configuration. Only local foreground playback is used. | Android retains audio-output settings permission only. |
| Draft preservation | Idle focus target, duration, interruption text, and next-move text survive background/process loss. | AsyncStorage. |
| Explicit calendar bridge | The idle focus form can open the system calendar with only the chosen focus title and duration prefilled. Spark does not list, read, or synchronize calendars and Android calendar read/write permissions are explicitly removed. | System-provided calendar UI; no Spark cloud or calendar account connection. |
| Focus home-screen widget | Shows the persisted active timer title, running/paused state, and timestamp-derived approximate time remaining. Pause/resume controls open a narrow Spark action route that updates the same persisted focus session and its completion notification. | Android widget plus local SQLite/AsyncStorage; no background server. Periodic launcher refresh is OS-controlled. |

## Capture: save for later

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Category-free capture | A thought can be saved without choosing project, priority, due date, or category. | Encrypted SQLite. |
| Main-form draft | Unsubmitted text is restored after background/process loss and cleared after a successful save. | AsyncStorage. |
| Android Share to Spark | Text and URLs shared from another Android app become local Capture items. | Android share receiver; no server. |
| Quick-capture widget | A small Android home-screen widget opens a focused capture form. | Android widget; no runtime cloud. |
| Local search | Appears once the list is larger and filters active/archived text entirely on-device. | In-memory filter. |
| Edit | Captured text can be corrected in place. | Local upsert. |
| Progressive action menu | Each active thought initially shows only **Focus**, **Select**, and **More actions**. Editing, conversion, archiving, and deletion appear only after the user asks for them, reducing default choices without hiding capability. | Local UI state only; $0 at every user count. |
| Archive and restore | Archive moves an item out of **Saved for later**; Put back restores it. | Local timestamp update. |
| Delete with immediate undo | Deletion is confirmed and the last deleted item can be restored immediately. | Local delete/reinsert. |
| Multi-select cleanup | Explicit selection supports archiving several saved thoughts together. | UI state and local updates. |
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
| Archive and restore | Archived routines retain all steps and can be managed from Progress. | Local archive timestamp. |
| Make step tiny | Switches to the optional tiny rescue wording without logging anything. | Saved run state. |
| Skip step | Advances without failure wording and records the skipped step only in the active run state. | Saved run state. |
| Pause routine | Keeps the exact step, tiny state, skipped steps, and start time across app restart. | Routine-run table; backup included. |
| Resume indicator | Progress shows when a routine has a saved position and which step is waiting. | Derived locally. |
| Finish estimate | Sums remaining unskipped estimates and shows an approximate duration and clock time. | Derived locally. |
| Linked habit | A step can open an explicitly linked habit editor/history entry point. | Optional local relationship. |
| Linked focus block | A step can define its own focus duration; every step also offers a two-minute launch fallback. | Optional local field. |
| Draft preservation | New and edited routines, including steps and links, survive process loss until saved. | AsyncStorage. |

## Calendar and useful review

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Week view | One compact row per habit and seven day cells make near-term completion patterns scannable without separate charts. | Local completion data; $0. |
| Month view | One six-week grid per habit mirrors the stakeholder-provided compact calendar concept. Completed, scheduled/flexible, outside-month, and ordinary cells have distinct but quiet visual states. | Local completion data; $0. |
| Record view | Shows total completions, active habits, habit management, exact recent history, archived habits, and—only when enabled—points and streaks. | Local totals and queries; $0. |
| Optional reward-first streaks | One completed action continues a daily streak, or any one completed action within a two-day period continues an every-other-day streak. Several actions in one period never inflate it. A blank period starts a neutral new streak, while the personal best and all ordinary history/points remain visible. Progress loads compact distinct completion dates across the habit’s full local lifetime rather than truncating an old best. | Pure local domain calculation over local completions; no account, analytics event, or cloud cost. |
| Streak saves | Every streak-enabled habit starts with 2 saves, earns 1 for every 5 completed periods, and can hold up to 3. A save can bridge the most recent closed blank period. It preserves continuity but does not create a completion, increase the chain count, or add Spark points. Saves are free and cannot be purchased. | Protection marker in `momentum_json`; deterministic local derivation; $0 at every user count. |
| Planned streak break | **Take a planned break for this period** marks the current open period as planned rest. It uses no streak save and adds no completed action. Existing habit pauses also bridge affected streak periods automatically. | Local protection/pause state only; no reminder or server side effect. |
| Streak milestones | Progress recognizes transparent completed-period thresholds (3, 7, 14, 30, 60, and 100) and shows the current streak, personal best, total completed periods, available saves, period status, and next start. Milestones add no opaque/random currency. | Derived locally; no cloud. |
| Comeback recognition | Returning after a gap is described positively; several wins on one day do not fake several active days. | Derived locally. |
| Fourteen-day activity | Shows completed actions and active days. Blank days are not red or labeled missed. | Materialized local summaries. |
| Weekly reflection | Summarizes attention and useful tiny sizes without a deficit score. | Derived locally. |
| Supportive observations | Can note frequent tiny use, helpful context, and better-fitting focus durations. Requires enough local evidence. | On-device derivation only. |
| Hide or disable observations | Each observation can be hidden; all observations can be disabled; hidden observations can be restored in Settings. | Local settings. |
| Optional points/percentages | Spark totals, levels, and rhythm percentages can each be hidden when they create pressure. | Local settings. |
| Optional point display | When enabled, Record adds the local point total. Point data is not promoted on Today and is absent from the default Calendar experience. | Derived local display only; $0 at every user count. |
| Weekly plan | Combines a short reflection, up to three visible habits, tomorrow context, and one tiny next action under direct **Weekly planning** language. | Encrypted local weekly-plan record. |
| Try a change for one week | Runs a user-chosen one-week “tiny version first” or “afternoon reminder” change. Spark compares local before/during counts with neutral language and never changes anything automatically to keep the user engaged. | Internally stored in the `personal_experiments` table; no analytics SDK, account, or server. |
| Deliberate progress sharing | The user selects up to five recent completed actions, previews a local card, then explicitly shares a PNG or plain text through the system share sheet. Nothing is sent automatically and no accountability account is connected. | Temporary device image/text only; no cloud upload by Spark. |
| Leave-on-time plan | Works backward from a chosen leave time using explicit preparation time and an optional routine estimate, saves the plan locally, and can start the routine or a two-minute focus session. | Internally stored in the `departure_plans` table; no location tracking. |
| Departure calendar bridge | Opens the system calendar with only the chosen departure block, buffer, and optional routine title. Spark does not read the calendar. | System-provided calendar UI; no Spark cloud. |

## Sensory, visual, and accessibility behavior

| Feature | Implementation and ADHD strategy | Data/cost |
| --- | --- | --- |
| Dark/light system theme | Follows device appearance. | Device setting. |
| High contrast | Replaces subtle surfaces with strong text and borders. | Local setting. |
| Reduced motion | Stops companion pulsing, calms celebrations, and makes navigation transitions instant. | Local setting. |
| In-settings feedback preview | Calm, balanced, and celebratory profiles can be inspected without creating a completion. | UI only. |
| Large text/narrow layouts | Cards scroll, chip/button labels wrap or shrink, routine runner remains scrollable, and actions use wrapping rows. | UI only; final device QA still required. |
| Touch targets and semantics | Primary controls use minimum heights, labels, roles, selected/checked state, busy/disabled state, and live regions. | Accessibility metadata. |
| System-bar-safe layouts | Shared screens respect both top and bottom safe-area insets so Android gesture/three-button navigation cannot cover primary controls. | Local layout behavior. |
| Keyboard-reachable forms | Shared screens scroll, grow to the viewport, preserve taps, and use Android height/iOS padding keyboard avoidance so focused onboarding and editor fields remain reachable. | Local layout behavior. |
| Progressive-disclosure sections | Settings is divided into independently expanding groups with useful summaries. Calendar uses three explicit views rather than nested panels, and completed Today items occupy one collapsed section. Optional features have a dedicated page instead of being mixed into general settings. | UI state only; no persistence or service cost. |
| Safe heading actions | Add-habit and add-routine controls reserve a fixed 48×48 area while adjacent headings can shrink/wrap, preventing long copy and larger text from pushing the plus icon off-screen. | Shared layout behavior; no cost. |
| History-aware back behavior | Save, cancel, close, and error-state actions return to the actual prior screen when navigation history exists. Widget/deep-link entries use an explicit meaningful fallback instead of an empty or unrelated screen. Ordinary guide links use push navigation so Back returns to the guide. | Local router history only; no cloud. |
| Button states | Pressed, disabled, and loading states are consistent; loading exposes text plus a progress indicator. | UI only. |
| Loading skeleton | Initial local-data loading uses static structural placeholders, not a decorative or endless animation. | UI only. |
| Color independence | Selection check marks, icons, wording, borders, and accessible names supplement color. | UI only. |
| Sensory Quiet now | One setting disables in-app haptics, soundscapes, navigation/companion motion, reward display, and celebration overlays until local midnight. It also moves reminders in that interval to no-vibration channels. | Expiring local setting only. |
| Optional app lock | Uses the device’s enrolled authentication and configurable background timeout. If authentication is unavailable after a restore or device change, Spark safely disables the lock rather than trapping the user. | Device authentication only; no Spark credential or account. |
| Sensitive app preview protection | On Android, optional secure-window protection hides the app switcher and blocks screenshots. On iOS, the app-switcher snapshot is protected without imposing Android behavior. | Local setting and OS privacy API. |
| Startup baseline profile | A packaged seed Baseline Profile covers Spark/React/Expo startup entry classes and is copied into every generated Android native project. It is a safe starting profile, not a substitute for later physical-device Macrobenchmark generation. | Build artifact only; no runtime service. |

## Supporter monetization

The free product includes unlimited habits, all recurrence types, optional habit sizes, Calendar,
reminders, Focus, Capture, routines, history correction, insights, accessibility, deletion, and
backup/restore. Optional-feature switches control visibility, not entitlement.

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

An optional, low-visibility Buy Me a Coffee footer is implemented separately from Premium. It is
off by default through `EXPO_PUBLIC_SPARK_CREATOR_TIP_LINK_ENABLED`, opens one fixed HTTPS page
only after a deliberate tap, transmits no Spark data or entitlement, and must remain off in store
builds unless the exact external-payment program and regional rules have been satisfied. Spark's
fixed cloud cost is $0 at 100, 1,000, 10,000, or 50,000 users; contributions and the payment
provider's percentage/processing fees are voluntary transaction flows, not app runtime spend.

## Local data, backups, and reliability

| Feature | Implementation | Notes |
| --- | --- | --- |
| Encrypted database | SQLCipher-backed Expo SQLite in native builds. Spark refuses private-data use in a native build when encryption cannot be verified. | Expo Go is explicitly labeled an unencrypted preview. |
| Current database schema | Version 7 with forward migrations for every released version. | Migration manifest is tested as contiguous. |
| Migration safety copies | Before a database migration, Spark creates an encrypted database copy and retains at most three. | Skipped in Expo Go preview. |
| Restore safety copies | Before JSON restore, Spark writes a private local JSON safety copy and retains at most three. | User can delete all automatic safety copies in Settings. |
| SQLite integrity check | `PRAGMA quick_check` runs after migration/open and is shown as a plain-language diagnostics result. | Failure is visible in Settings. |
| Versioned JSON backup | Schema 4 validates IDs, dates, references, pauses, friction plans, linked habits, deferrals, routine run state, weekly/leave-on-time plans, one-week changes, settings, tags, and contexts. | Maximum imported plaintext size is 10 MB. Internal backup keys retain their stable historical names for compatibility. |
| Legacy backup migration | Backup schemas 1, 2, and 3 migrate into schema 4 with safe defaults. | Automated tests cover every released backup schema. |
| Portable CSV | Exports habit and completion history, including context and completion tags. | Spreadsheet-formula prefixes are neutralized. |
| Restore preview | Shows file name and entity counts before confirmation. | Current data is replaced only after explicit confirmation. |
| Password-encrypted portable backup | Uses PBKDF2-SHA256 and authenticated AES-256-GCM. A wrong password or modified file fails before restore. Manual-export passwords are not stored. | Local cryptography and system share sheet; no server. |
| Recovery code | Generates a high-entropy human-readable code in device secure storage, reveals it behind device authentication when available, and lets the user explicitly share/print it. Spark has no server-side recovery. | SecureStore only. |
| Automatic Android folder backup | The user grants access to one folder through Android’s Storage Access Framework. Spark writes at most once per day when opened and changed, keeps seven newest encrypted files, and never requests broad storage permission. | Local/user-selected provider. If the user chooses a third-party cloud-drive folder, that provider’s own plan/network usage is outside Spark. |
| Device-specific restore safety | Portable backups intentionally clear Quiet now, app lock, automatic-backup folder URI, automatic-backup enabled state, and last-backup time so a restore cannot carry stale device permissions or lock a new device. | Import/export safety rule. |
| Android Auto Backup disabled | The release manifest sets `allowBackup=false`; Spark does not silently copy its private app sandbox into an OS-managed backup. Users retain explicit manual/password-encrypted export choices. | Native privacy boundary; no cloud runtime. |
| Draft storage | Habit, routine, focus, main Capture, and quick-capture unfinished text/state is debounced locally. | Cleared after successful submission. |
| Materialized progress | Long histories use totals and daily summaries rather than loading every completion for the normal app shell. | Habit history queries are bounded. |
| Native SQLite path compatibility | Android can expose the private SQLite directory as a raw `/data/data/...` path. Spark converts it to a `file://` URI only for Expo FileSystem listing while retaining the raw path for SQLite backup/deletion, preventing startup failure during migration safety-copy pruning. | Local path normalization; native regression-tested; no permission or cloud access. |

### Local schema inventory

- `habits` and `habit_variants`
- `completions`, including context and optional tags
- `focus_sessions`
- `capture_items`
- `routines` and `routine_steps`, including habit/focus links
- `daily_checkins`, including context
- `habit_deferrals`
- `routine_runs`
- `weekly_plans`
- `departure_plans`
- `personal_experiments`
- `settings`
- `entitlement`
- `meta`

All of these user-facing local entities are represented in JSON export/import where appropriate.

## Android integrations

| Integration | Behavior | Release note |
| --- | --- | --- |
| Today widget | Displays one eligible action and a clearly labeled Log tiny entry point. Opening it requires confirmation before logging. | Native development/release build required. |
| Habit Calendar widget | A 4×4 monthly widget shows up to two active habits as six-week grids. Completed cells use the habit color; scheduled/flexible cells remain quiet. Tapping opens Calendar and never writes a completion. | Native Android build required; local AsyncStorage snapshot only; $0 runtime at every user count. |
| Quick Capture widget | Opens the minimal quick-capture route. | Native development/release build required. |
| Focus widget | Shows local timer state and opens reliable pause/resume action routes. The displayed remaining time is derived from timestamps on every OS widget render; launchers still control periodic refresh frequency. | Native development/release build and launcher QA required. |
| Routine widget | Shows the current persisted routine step, step count, and paused state, or a calm create-routine empty state. Tapping only opens the routine; it never advances or completes a step. | Native Android build required; local SQLite/AsyncStorage snapshot only; $0 runtime at every user count. |
| Progress widget | Shows lifetime wins, fixed Spark points, and today’s win count from the same small local snapshot as Today, then opens Calendar/Record. It creates no streak deadline and sends no data. | Native Android build required; AsyncStorage snapshot only; $0 runtime at every user count. |
| Toolkit widget | A compact four-action surface opens Quick Capture, two-minute Focus, leave-on-time planning, or Help me now. No habit/note text is placed in shortcut metadata. | Static native Android widget; $0 runtime at every user count. |
| Static launcher shortcuts | Long-pressing Spark exposes Quick capture, 2-minute focus, Rescue my day, and Resume routine. Shortcut metadata contains no habit or note content. | Generated native Android resources; launcher QA required. |
| Share target | Receives shared text/URLs into Capture. | Android is enabled first; no storage/contact/location permission. |
| Local notifications | Schedules occurrence-aware reminders and actions. | Native development build needed for reliable action QA. |
| Haptics | Optional foreground completion feedback. | Uses device haptic capability. |
| Offline audio | Foreground-only local WAV playback. | Microphone, recording, and background playback are disabled. |
| System calendar export | Creates a single user-reviewed event through system UI. Calendar read/write permissions are blocked in the generated Android manifest. | Native build required; no full-calendar access. |
| Biometric/device lock | Uses Android biometric/device-credential APIs only after the user turns on app lock. | Native build/device enrollment required. |
| Sensitive-preview protection | Uses secure-window behavior on Android when explicitly enabled. | Screenshot and recent-app behavior require real-device QA. |

Expo Go remains useful for ordinary screen work but cannot accurately validate SQLCipher, Android
widgets, notification actions, the share receiver, in-app purchases, or the final native manifest.

## Optional cloud and admin features

These features do not receive habit content, completion history, focus text, Capture text, routine
text, or daily check-ins.

| Feature | Cloud purpose | Default-off control |
| --- | --- | --- |
| Cloud foundation | Shared Cloud Run, Firestore, and Artifact Registry resources. | Terraform `enable_cloud_runtime=false`. |
| Remote configuration | Global defaults, feature shutdowns, and announcements. | Mobile `EXPO_PUBLIC_SPARK_REMOTE_CONFIG_ENABLED=false`; cached config is ignored while off. |
| Global announcements | One bounded message on Today. | App config `announcementsEnabled=false`. |
| Private support | User-created asynchronous support conversations. | App config `supportEnabled=false`; enforced on user and admin API routes. |
| Purchase verification | Verifies Google Play ownership, acknowledgement, restore, and revocation. | App config `purchasesEnabled=false`; enforced by the API. |
| Entitlement grants | Owner/admin can grant or revoke supporter access for a user. | App config `manualGrantsEnabled=false`; enforced by the API. |
| Promo inventory | Imports and assigns official Play promo codes. | App config `promoCodesEnabled=false`; enforced by the API. |
| User review | Bounded overview, user lookup, and audit pages. | App config `userReviewEnabled=false`; enforced by the API. |
| Admin roles | Support, content, and owner access boundaries. | App config `adminRolesEnabled=false`; enforced by the API. |
| Admin dashboard | Hosts the operator interface. | Build flag `VITE_SPARK_ADMIN_ENABLED=false`; Hosting deployment remains manual. |
| Google Play RTDN | Receives Play lifecycle events through Pub/Sub. | Terraform `enable_google_play_rtdn=false`. |
| Retention cleanup | Deletes bounded expired support/audit/deduplication data. | Terraform `enable_maintenance_job=false`. |
| Synthetic monitoring | Five-minute readiness probe and 5xx alert. | Terraform `enable_synthetic_monitoring=false`. |

Approximate costs at 100, 1,000, 10,000, and 50,000 users, official pricing links, assumptions,
and emergency controls are maintained in
[08-cost-controls.md](./08-cost-controls.md). At current assumptions the cloud portion is normally
$0 to a few dollars per month through 50,000 users; Google Play transaction fees are separate.

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
- random rewards, paid/recurring streak insurance, or loss-framed notifications (Spark’s free
  local streak saves and planned breaks are transparent continuity tools, not monetized repair);
- mandatory analytics, advertising SDKs, or session replay;
- microphone recording;
- health-platform data access;
- background sound streaming.
- automatic calendar reading or account-wide calendar synchronization;
- automatic progress reports or connected accountability accounts;
- product-managed A/B engagement experiments.

## Proposal audit: what is still not implemented

All actionable local-first UX items in
[10-experience-roadmap.md](./10-experience-roadmap.md), including its **Helpful next layer**, plus
the subsequent assistive expansion (contextual help, weekly reset, friction toolkit,
leave-on-time planning, privacy controls, encrypted folder backup, shortcuts, diagnostics,
localization, deliberate sharing, calendar export, one-week changes, the focus widget, and
optional non-punitive streaks), plus the July 20 minimal-experience overhaul (explicit schedules,
yes-or-no habits, completion-shifted recurrence, Week/Month/Record calendar, feature switches,
and Calendar widget)
are implemented in code. What remains falls into four explicit groups:

1. **Deliberately rejected/deferred product ideas:** the items above, plus optional aggregate
   analytics until there is a real decision need and an explicit disclosure/consent design.
2. **Deliberate substitutions:** Spark generates three offline soundscapes instead of shipping a
   third-party licensed sound pack. Supporter icon treatments work inside Spark/widgets, while
   launcher icon variants remain a build-time release choice rather than fragile runtime Android
   activity aliases.
3. **iPhone-specific future work:** a signed iOS build, StoreKit server verification and
   revocation handling, iOS widgets, App Store configuration, and native iPhone/iPad QA.
4. **Manual release/operations work:** real-device Android QA, legal/operator placeholders,
   Play/Firebase/GCP console setup, a reviewed Terraform plan, store listings, and live purchase,
   refund, RTDN, promo, and grant tests.

The original notes' casino-style variable rewards and paid/loss-framed streak insurance were not
copied. They are replaced with fixed rewards, transparent progress, tiny versions, neutral blank
days, comeback support, and optional local streak continuity tools that cannot be purchased.
The original “growing avatar” widget concept was also
not copied literally: Spark uses actionable Today, Calendar, Focus, Routine, Progress, Toolkit,
and Quick Capture widgets, while
companions live in Focus where they do not pressure home-screen engagement.

## Automated coverage

The exact current total is printed by the command below rather than duplicated as a manually
maintained number. The July 20 redesign specifically added schedule-shifting, calendar-grid,
feature-toggle, minimal-editor/onboarding, migration, reminder, widget snapshot, widget routing,
and plain-language regression coverage.

```powershell
npm.cmd run test:coverage
```

Current measured coverage is 58.14% statements across every mobile route/source file, 99.63% in
the domain package, 88.53% in the control-plane HTTP application, and 73.76% across admin source.
The mobile figure intentionally counts large screen/editor files that are still primarily covered
by device QA; service and local-helper coverage is substantially higher.

Focused checks cover:

- schedule, interval, pause, comeback, reward, timezone, and DST behavior;
- Today recommendation sizing;
- supportive insight derivation;
- preferred reminder times, reminder windows, pause exclusions, and weekly spreading;
- rapid duplicate-completion guarding;
- disabled completion controls and direct tiny/focus/deferral actions;
- current and legacy backup schemas, encryption, file selection, sharing availability, size
  limits, retention, restore safety copies, CSV injection protection, reference validation,
  context, and routine recovery state;
- schema-4 plans/experiments/friction migration and reference validation;
- optional streak opt-in, daily/two-day period math, duplicate-completion resistance, gaps, future
  starts, pauses, planned breaks, streak-save restoration/earning, milestones, local persistence, and
  backup validation;
- contiguous database migration versions, native SQLCipher refusal, and integrity reporting;
- central provider persistence for completions, capture, focus, routines, plans, settings,
  entitlement, deferrals, notification actions, widget synchronization, and automatic backup;
- one-week-change application and neutral comparison;
- leave-on-time calculations, calendar handoff, deliberate progress sharing, and Quiet now;
- Lithuanian localization plus English fallback behavior;
- timestamp-derived focus-widget state and pause/resume route actions;
- diagnostics redaction, corrupt diagnostic recovery, error boundary fallback, and themes;
- energy and settings accessibility components;
- control-plane health/readiness/auth, privacy, support lifecycle, purchase states, entitlement
  expiry, bounded admin lists, roles, grants, promo inventory, audit filters, and RTDN;
- admin shell setup/session behavior plus configuration, user grants, private support, official
  promo imports, bounded audit filtering, and role changes.

Native Android QA is still required for widgets, share receiving, notification actions, haptics,
audio output, SQLCipher verification, Play Billing, large-text rendering on representative devices,
calendar/document system UI, browser Firebase sign-in, and routine recovery after the operating
system kills the process.

## Source map

| Area | Main implementation |
| --- | --- |
| Shared recommendation/progress logic | `packages/domain/src/` |
| Local schema, migrations, integrity, export/import | `apps/mobile/src/data/database.ts` |
| Backup validation and safety copies | `apps/mobile/src/services/backup.ts` |
| Encrypted and automatic folder backups | `apps/mobile/src/services/backup.ts`, `app/encrypted-backups.tsx` |
| Today, Calendar, and optional feature controls | `apps/mobile/app/(tabs)/index.tsx`, `journey.tsx`, `apps/mobile/app/features.tsx` |
| Minimal onboarding and replayable tutorials | `apps/mobile/app/onboarding.tsx`, `tutorials.tsx`, `src/lib/tutorials.ts` |
| Focus and soundscape | `apps/mobile/app/(tabs)/focus.tsx`, `src/services/soundscapes.ts` |
| Help, weekly reset, leave-on-time planning, one-week changes | `apps/mobile/app/help.tsx`, `weekly-reset.tsx`, `departure.tsx`, `experiments.tsx` |
| Progress-card sharing and calendar bridge | `apps/mobile/app/share-progress.tsx`, `src/services/calendarBridge.ts` |
| Capture and Android share | `apps/mobile/app/(tabs)/capture.tsx`, `src/state/SparkProvider.tsx` |
| Habit editing/history | `src/components/HabitEditor.tsx`, `app/habit/[id]/history.tsx` |
| Optional streak domain/UI (internal `momentum` name) | `packages/domain/src/momentum.ts`, `src/components/MomentumCard.tsx`, `app/(tabs)/journey.tsx` |
| Routine editing/running | `src/components/RoutineEditor.tsx`, `app/routine/[id].tsx` |
| Notifications | `apps/mobile/src/services/notifications.ts` |
| Android widgets | `apps/mobile/src/widgets/`, `apps/mobile/app.config.ts` |
| Android launcher shortcuts/startup profile | `apps/mobile/plugins/`, `apps/mobile/assets/baseline-prof.txt` |
| Sensory/accessibility theme | `apps/mobile/src/theme.ts`, `src/components/` |
| Localization | `apps/mobile/src/i18n/` |
| App lock, preview protection, diagnostics | `src/components/PrivacyGate.tsx`, `app/diagnostics.tsx` |
| Optional cloud/admin | `services/control-plane/`, `apps/admin/` |
