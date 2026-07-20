# Spark product plan

## Product promise

Spark helps a person notice, start, resize, and return to useful actions without turning an
inconsistent day into a moral verdict.

It is intentionally not a clinical treatment, diagnostic tool, social network, gambling loop,
or surveillance product.

## Decisions made from the original concept

The strongest ideas were kept:

- immediate tactile and visual celebration
- a single Done action by default, with optional small, regular, and larger versions when they
  genuinely help
- no-reset progress
- a visible Android home-screen widget
- focus/body-doubling
- low-friction capture

One original idea was deliberately changed. Rewards are fixed and visible instead of random.
Variable-ratio rewards can create compulsive engagement and conflict with Spark's goal of
supporting user agency. Novelty comes from color, animation, companions, suggestions, and
optional cosmetic themes—not casino mechanics.

## Implemented phases

### Phase 1 — offline foundation

- Expo/React Native Android and iPhone codebase
- encrypted SQLCipher database with its key in platform secure storage
- no account or server required
- pure scheduling/recommendation/reward domain package
- daily, selected weekdays, times-per-week, fixed interval, completion-shifted interval, and anytime rhythms
- device-only JSON export and restore

### Phase 2 — humane habit loop

- an optional capacity check-in: running low, steady, or ready
- an optional time-available filter
- a minimal, schedule-first Today list
- optional small/regular/larger action choices
- optional tactile Spark celebration with reduced-motion support
- undo
- five-second activation prompt
- pause and archive without deleting history
- rolling rhythm percentages and comeback recognition
- optional per-habit daily/every-other-day streaks with earned streak saves, planned breaks,
  preserved personal bests, and no point penalties

### Phase 3 — ADHD-supportive tools

- timestamp-safe focus timer
- visual body double
- saving interruptions into Capture
- unstructured brain dump
- captured thought to habit handoff
- one-step-at-a-time transition routines
- capped, quiet local reminders with Log tiny, Later, and Quiet today actions
- Android Today and Quick Capture widgets with explicit confirmation before a completion
  (later expanded with a Focus widget and launcher shortcuts)
- sensory settings, screen-reader labels, large touch targets, and dark mode

### Phase 4 — ethical monetization

- all core executive-function tools remain free
- lifetime premium adapter for Google Play Billing
- server-side purchase verification before entitlement
- purchase restore
- official Google Play promo-code inventory
- audited manual grants for selected cloud identities
- iOS product interface is shared; App Store setup waits for the iOS release

### Phase 5 — optional low-cost control plane

- anonymous Firebase identity is created only for support or purchases
- private asynchronous support conversations
- bounded app configuration
- Cloud Run scale-to-zero API
- Firestore with no direct client access
- role-based admin dashboard
- support, user, config, Play promo, grants, roles, and audit functions
- Terraform cost constraints and a small budget alert

### Phase 6 — quality and release

- domain, mobile-component, API, and dashboard tests
- one authoritative Maestro Android end-to-end flow
- CI, manual EAS build, and manual cloud-deploy workflows
- beginner setup, cost, policy, testing, release, and troubleshooting documentation

### Phase 7 — assistive local-first expansion

- Simple mode and contextual Help me now
- gentle weekly reset with tomorrow context/tiny planning
- per-habit friction toolkit
- Leave on time with optional routine and real buffer
- explicit focus/departure calendar handoff without calendar reads
- user-selected progress-card image/text sharing without connected accounts
- one-week changes with neutral local comparison
- one-action sensory Quiet now
- optional device-authentication lock, recent-app/screenshot protection, and notification privacy
- password/recovery-code encrypted backup plus bounded automatic Android folder backup
- Android Focus widget and four launcher shortcuts
- bundled selection for 19 languages including Lithuanian, with translated daily controls,
  locale-aware dates/times, native per-app locale declarations, and RTL Arabic support
- content-redacted diagnostics and a packaged Android startup Baseline Profile

## Features intentionally not in the first public release

These should be evaluated with real users instead of being enabled speculatively:

- cross-device habit synchronization; it changes the privacy and cost model
- user-to-user chat or public communities; moderation and safety become a different product
- automatic AI coaching; it creates recurring inference cost and sensitive-data questions
- medication dosing or medical advice; Spark is not a medical system
- blocking other apps; it requires sensitive device permissions and strong policy justification
- location-triggered reminders; they add permission and battery burden
- randomized rewards, loss aversion, streak repair purchases, ads, and attention-selling analytics
  (free local streak saves are allowed because they are transparent and non-monetized)

## Completed experience and reliability pass

The 2026-07-16 implementation added explicit widget confirmation, rapid-tap protection,
remembered check-ins, neutral deferrals, focus launches, habit history/correction, fully editable
and restart-safe routines, Capture cleanup/share/search/conversions, reminder windows, local
observations, generated offline soundscapes, supporter cosmetics, bounded safety copies, integrity
reporting, and unfinished-form drafts.

The subsequent Phase 7 expansion is also complete in code. The remaining work is manual
validation or deliberately deferred scope:

1. Test all seven Android widgets and four shortcuts across Pixel, Samsung, and Xiaomi launchers.
2. Test larger fonts, TalkBack, switch access, reduced motion, notification actions, share
   receiving, app lock, preview protection, calendar handoff, folder backup, sound output,
   localization/RTL, and color-blind use on real devices.
3. Conduct the final threat-model and privacy review before cloud production.
4. Add only opt-in aggregate product events if real product decisions eventually require them.
5. Build the iOS binary and iOS widget when Apple release work begins.

The original rationale is in [10-experience-roadmap.md](10-experience-roadmap.md); the complete
current inventory is [11-feature-catalog.md](11-feature-catalog.md).

## Success measures

Avoid daily-active-user and notification-click goals that reward compulsive opening. Prefer:

- users can complete first onboarding and first tiny action without help
- percentage of users who return after a blank week
- focus sessions that end intentionally instead of being abandoned
- notification opt-out rate
- support reports mentioning shame, pressure, confusion, or sensory discomfort
- backup/restore success
- accessibility task completion
