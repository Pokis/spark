# Google Play declarations for the initial Spark build

Use this as a form-by-form worksheet in Play Console. It describes the exact **free, offline,
default-off production profile** currently configured in the repository. It is not a substitute
for reading the wording shown in your own Play Console or for your final legal attestation.

## Confirmed publisher decisions

| Decision | Confirmed value |
| --- | --- |
| Permanent package ID | `com.djpokis.sparkhabits.app` |
| Publisher/account type | Individual |
| Public developer/operator name | Domantas Judeikis |
| Country | Lithuania |
| Privacy and support email | `djpokis@gmail.com` |
| Initial price | Free |
| Availability intent | All countries/regions offered by Play, subject to Play eligibility and law |
| Default listing | English, with every bundled Spark language prepared as a translation |
| Target audience | Adults aged 18 and over; not directed to children |
| Health feature | Stress Management, Relaxation, Mental Acuity; non-clinical self-management |
| Cloud/purchases/analytics/ads/tip link | Disabled for the initial build |
| Privacy hosting project | `djpokis-spark-habits`; static Firebase Hosting only |

## Build facts to verify first

Run:

```powershell
.\spark.cmd release -Action Inspect
.\spark.cmd release -Action Assets
```

Continue only if the build still has:

- no API base URL;
- remote config off;
- purchases and entitlement verification off;
- creator-tip link off;
- no analytics, advertising, crash-reporting, or session-replay SDK; and no remote push-token
  registration, remote notification delivery, or push server configured (`expo-notifications` is
  used only for on-device scheduled reminders);
- no login or account creation; and
- local habits, notes, routines, focus history, experiments, and progress only.

## Ads

**Recommended Play answer: No, the app does not contain ads.**

Spark contains no ad SDK, banner, interstitial, rewarded ad, sponsored placement, or behavioral
ad measurement. A future optional Buy Me a Coffee link is also off for the Play build; re-review
commercial-content wording before enabling it.

## App access

**Recommended Play answer: All functionality is available without special access.**

There is no sign-in, membership, organization, region-locked test account, or external hardware
requirement. Reviewer instructions:

```text
Spark opens without an account. Complete or skip onboarding, then use Today, Focus, Capture,
Progress, and Settings. All initial-release features operate locally; no test credentials are
required.
```

## Target audience and children

**Recommended selection: ages 18 and over only.**

Spark is written for adults managing their own routines, focus, and ADHD-related friction. It is
not designed, marketed, or visually targeted to children. Confirm this product choice yourself;
if you later include children, obtain specialist policy/privacy review before changing the age
groups or store art.

## Content rating questionnaire

Use **Productivity/Utility** when the questionnaire asks for the app type. For the current build,
the expected answers are:

| Topic | Expected answer | Evidence |
| --- | --- | --- |
| Violence or graphic content | No | No violent content or user media |
| Sexuality or nudity | No | No sexual content |
| Profanity or crude humor | No | Bundled copy contains neither |
| Controlled substances | No | No tobacco, alcohol, or drug content |
| Gambling or simulated gambling | No | Points are fixed progress feedback, never wagered, bought, randomized, or redeemable |
| Fear or horror | No | No fear content |
| User-generated public content | No | Notes and habits are private local text; there is no public feed or server |
| User-to-user communication | No | System sharing is a deliberate export, not in-app messaging |
| Location sharing | No | Spark does not request location permission |
| Purchases | No exposed purchase in this initial build | Billing code is dormant behind an off-by-default flag and no product is offered |

Answer the live wording truthfully. If Play asks whether users can exchange information through
other installed apps, distinguish Android's user-initiated share sheet from an in-app social or
chat system.

## Data safety

**Recommended top-level answer for this exact build: no user data is collected or shared by the
developer.**

Google treats on-device processing that is never sent off the device as outside Data safety
“collection.” Spark's initial build stores its content locally and does not operate a Spark
server. Complete the form even if the answer is no data collected.

| Data or action | Current behavior | Data safety treatment for this build |
| --- | --- | --- |
| Habits, actions, notes, routines, focus history, experiments, settings | Stored in the app's local encrypted database | Not collected or shared by the developer |
| Local reminders and timer notifications | Scheduled on the device | Not collected or shared by the developer |
| Optional folder backup/export | Written only to a location the user deliberately selects | User-initiated local transfer; not sent to the developer |
| Calendar bridge | Opens a system calendar handoff for one user-chosen event; Spark does not read the calendar | Not collected or shared by the developer |
| Progress sharing | Sends user-selected text/image through Android's share sheet | User-directed action; Spark has no recipient account or automatic reporting |
| Biometrics | Android returns only an authentication result | No biometric data is received or stored by Spark |
| Diagnostics | Shown locally for the user to copy/share deliberately | No automatic telemetry or crash upload |
| Play Billing | Not offered or initialized as a user feature in the initial build | No purchase data collected by the Spark developer in this build |

The app has no account system, so there is no in-app or web account-deletion workflow to declare.
Users can erase Spark's local content from in-app privacy/data controls, Android app storage, or
by uninstalling. Do not claim a hosted deletion URL exists.

The public privacy-policy URL is
`https://djpokis-spark-habits.web.app/privacy.html`. It was deployed and verified without sign-in
on July 17, 2026, and uses the same operator details as `docs/privacy-policy.md`.

## Health apps declaration

Spark is ADHD-friendly and provides focus, habit, routine, stress-friction, and self-management
guidance. Treat it conservatively as having a health-related feature.

**Recommended category: Stress Management, Relaxation, Mental Acuity.**

Describe its purpose as:

```text
Spark is a non-clinical planning and self-management tool. It helps adults break habits and
tasks into visible actions, run focus timers, follow routines, and review locally stored
progress. It does not diagnose, monitor, treat, cure, or prevent ADHD or any medical condition,
and it does not provide clinical decisions, counseling, or emergency support.
```

Do not select medical device, diagnosis, treatment, medication, clinical decision support, or
provider/patient communication. Select **Mental and Behavioral Health** only if the live Play
definition explicitly requires ADHD-oriented self-management apps or Spark later adds mental
health assessment, counseling, or treatment functionality. Read the live category descriptions
and confirm the final category yourself.

Keep this disclaimer in the listing and onboarding/help content:

```text
Spark is a planning and self-management tool. It does not diagnose, treat, cure, or prevent ADHD
or any medical condition and is not a substitute for professional care.
```

## Other App content cards

| Play card | Recommended answer for initial build |
| --- | --- |
| Privacy policy | `https://djpokis-spark-habits.web.app/privacy.html`; live and verified without login on July 17, 2026 |
| News app | No |
| COVID-19 contact tracing/status | No |
| Government app | No |
| Financial features | None |
| Advertising ID | Not used; Spark has no ad/attribution SDK |
| Data deletion | No developer account exists; explain local deletion if a free-text field appears |
| Families | Not participating; 18+ audience recommendation |

## Permission and SDK evidence

The merged release manifest was inspected on July 17, 2026. It does **not** request location,
calendar read/write, camera, microphone recording, contacts, SMS, call log, broad storage, or
photos/media permissions.

Expected permissions include network state/Internet from the app framework and dormant optional
integration libraries; notifications, vibration, wake lock, boot completion, foreground service,
biometric authentication, screen-capture protection, Play Billing, install referrer, and launcher
badge integration. The notifications library also contributes the FCM/C2DM receive permission,
but this build never requests a push token or configures remote delivery. None gives Spark access
to restricted personal content by itself.

No sensitive/restricted-permission declaration is expected for the current manifest. Always
inspect the final `.aab` in Play Console's App Bundle Explorer because dependency updates can
change the merged manifest.

## Reviewer note

```text
Spark is a local-first productivity and self-management app. It requires no account or server.
The initial release has cloud support, purchases, remote configuration, analytics, advertising,
and the creator-tip link disabled. Habits, notes, focus history, and progress remain on-device.
Calendar and sharing actions are explicit user-initiated system handoffs; Spark does not read the
calendar or connect users to one another.
```

## Change triggers — do not skip

Every cost-bearing feature is off by default. If a flag is enabled, stop and revise the affected
forms before publishing that build.

| Change | Forms and copy to re-review | Cost behavior |
| --- | --- | --- |
| Cloud accounts, sync, or remote support | Data safety data types/purposes, privacy policy, retention, account deletion, app access/reviewer account, security practices | Can create Cloud Run/Firestore/Auth/support costs; see `docs/08-cost-controls.md` |
| Play purchases or grants | Data safety purchase history/user ID, content rating purchases, store “in-app purchases” disclosure, monetization copy, Play product setup | Play service fee applies to paid transactions; backend verification/RTDN can create cloud cost |
| Analytics, crash reporting, or session replay | Data safety app activity/diagnostics/device IDs, privacy policy, SDK disclosure, consent where required | Usage-based vendor/cloud cost; none is currently installed/enabled |
| Remote push notifications | Data safety device ID/token, privacy policy, retention/security, notification consent UX | Messaging may be free but token storage/API workloads can cost money |
| Creator-tip link | Store commercial-content wording and Play payments-policy review | No Spark server cost, but external processor fees may apply |
| Advertising | Ads declaration, Data safety, content rating, target audience/Families, privacy/consent, advertising ID | Ad SDK and compliance overhead; deliberately absent |
| Health assessment, symptom tracking, or provider communication | Health category, Data safety health data, privacy policy, clinical/regulatory review, listing claims | High compliance and potentially substantial service cost; deliberately absent |
| Any new Android permission or SDK | Data safety, permission declarations, privacy policy, reviewer instructions | Depends on SDK/service; inspect before enabling |

## Manual confirmations before submission

- [x] `com.djpokis.sparkhabits.app` is the permanent ID.
- [x] Publisher/operator name, postal address, country, monitored email, and retention language are supplied consistently.
- [x] Privacy URL is public HTTPS and opens without sign-in.
- [ ] The signed `.aab` uses the offline/default-off profile described above.
- [ ] 18+ is the intended audience.
- [ ] Health category and disclaimer match the live Play wording.
- [ ] Countries/regions and free pricing are intentional.
- [ ] The Data safety, content-rating, and App content answers were personally reviewed in Play Console.
