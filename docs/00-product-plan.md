# Spark product plan

## Product promise

Spark helps a person notice, start, resize, and return to useful actions without turning an
inconsistent day into a moral verdict.

It is intentionally not a clinical treatment, diagnostic tool, social network, gambling loop,
or surveillance product.

## Decisions made from the original concept

The strongest ideas were kept:

- immediate tactile and visual celebration
- tiny, standard, and stretch versions of every habit
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
- daily, selected weekdays, times-per-week, interval, and anytime rhythms
- device-only JSON export and restore

### Phase 2 — humane habit loop

- capacity check-in: running low, steady, or ready
- time-available filter
- decision-reduced Today plan
- transparent tiny/standard/stretch actions
- tactile Spark celebration with reduced-motion support
- undo
- five-second activation prompt
- pause and archive without deleting history
- rolling rhythm percentages and comeback recognition

### Phase 3 — ADHD-supportive tools

- timestamp-safe focus timer
- visual body double
- interruption parking into Capture
- unstructured brain dump
- captured thought to habit handoff
- one-step-at-a-time transition routines
- capped, quiet local reminders with Tiny and Later actions
- Android home-screen widget with a visible next action
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
- Maestro Android end-to-end flows
- CI, manual EAS build, and manual cloud-deploy workflows
- beginner setup, cost, policy, testing, release, and troubleshooting documentation

## Features intentionally not in the first public release

These should be evaluated with real users instead of being enabled speculatively:

- cross-device habit synchronization; it changes the privacy and cost model
- user-to-user chat or public communities; moderation and safety become a different product
- automatic AI coaching; it creates recurring inference cost and sensitive-data questions
- medication dosing or medical advice; Spark is not a medical system
- blocking other apps; it requires sensitive device permissions and strong policy justification
- location-triggered reminders; they add permission and battery burden
- randomized rewards, loss aversion, streak repair purchases, ads, and attention-selling analytics

## Sensible validation backlog

1. Test the Android widget across Pixel, Samsung, and Xiaomi launchers.
2. Add a small bundled offline soundscape pack after licensing and sensory testing.
3. Add a visual routine editor after observing how people structure transitions.
4. Test larger fonts, TalkBack, switch access, reduced motion, and color-blind palettes.
5. Conduct a threat-model and privacy review before cloud production.
6. Measure only opt-in aggregate product events, if measurement becomes necessary.
7. Build the iOS binary and iOS widget only when an Apple Developer membership is available.

## Success measures

Avoid daily-active-user and notification-click goals that reward compulsive opening. Prefer:

- users can complete first onboarding and first tiny action without help
- percentage of users who return after a blank week
- focus sessions that end intentionally instead of being abandoned
- notification opt-out rate
- support reports mentioning shame, pressure, confusion, or sensory discomfort
- backup/restore success
- accessibility task completion

