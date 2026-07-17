# Spark documentation home

Start here when you are unsure which document to open. The files are grouped by
task below; you do not need to read the repository front to back.

## If you only read five documents

1. [START-HERE.md](../START-HERE.md) — first commands and the shortest beginner path.
2. [Run the mobile app](./02-run-mobile.md) — Expo Go, Android emulator/device, and debugging.
3. [Testing](./testing.md) — automated checks and the device test matrix.
4. [Android release](./03-android-release.md) — beginner, field-by-field build and Play Console walkthrough.
5. [Release checklist](./release-checklist.md) — staged Internal, Closed, and Production gates.

The ready-to-upload [Google Play submission pack](../store/android/README.md) contains the final
graphics, listings for all 19 bundled languages, screenshot descriptions, and form-by-form
declarations in one place.

On Windows, [PowerShell command helper](./12-powershell-tools.md) provides guided commands for
setup, running, testing, Android utilities, EAS releases, guarded Firebase/Google Cloud deployment,
and optional local services.

Cloud is optional. Read the [cost register](./08-cost-controls.md) before the
[Google Cloud guide](./04-google-cloud.md).

## Choose your current goal

### I want to see the app locally

Read in this order:

1. [START-HERE.md](../START-HERE.md)
2. [Windows setup](./01-windows-setup.md)
3. [Run the mobile app](./02-run-mobile.md)
4. [Troubleshooting](./troubleshooting.md) only if something fails

No Firebase, Google Cloud, admin dashboard, or payment setup is needed.

### I want to test whether it works

1. [Testing strategy and commands](./testing.md)
2. [Quality/release-readiness review](./quality-review.md)
3. [Feature catalog](./11-feature-catalog.md) to choose the manual feature matrix

Automated tests are not a substitute for real-device checks of widgets,
notifications, biometric/device lock, screenshot/app-switcher protection, calendar handoff,
folder backup permissions, billing, accessibility, SQLCipher, sound, and Android process death.

### I want to release the free Android app

1. [Android release quick steps](./03-android-release.md#short-version-get-the-first-internal-test-into-google-play)
2. [Google Play submission pack](../store/android/README.md)
3. [Release checklist](./release-checklist.md)
4. [Completed privacy-policy source](./privacy-policy.md) and its verified public HTML URL when
   Play asks for it
5. [Privacy and Google Play policy reference](./09-data-privacy-and-play-policy.md) only when
   completing Play's declarations

Start with the Android guide's **Short version: get the first Internal test into Google Play**.
Its first table tells you exactly where each action happens, who must do it, the command or click
path, and what “done” looks like. Each detailed section begins with the same concrete TLDR, so you
only need the longer explanation when a check fails or a console screen is unfamiliar. Stop after
the Internal-testing steps for the first release.
The first free release can remain completely offline and have a $0 cloud runtime.

### I want support, grants, purchases, or the admin dashboard

1. [Costed features and switches](./08-cost-controls.md)
2. [Optional Google Cloud setup](./04-google-cloud.md)
3. [Admin dashboard](./05-admin-dashboard.md)
4. [Monetization and free grants](./06-monetization.md)
5. [Security model](./security.md)

Every cost-bearing feature is off by default. Deploy the shared runtime first,
then enable only the individual capability being tested.

### I want to understand the product and codebase

1. [Feature catalog](./11-feature-catalog.md) — authoritative implemented behavior.
2. [Product plan](./00-product-plan.md) — decisions, principles, and phase history.
3. [Architecture](./architecture.md) — packages, boundaries, and data flow.
4. [Experience roadmap](./10-experience-roadmap.md) — completed experience pass and
   deliberately deferred ideas.

### I want to work on iPhone later

Read [the iPhone release guide](./07-ios-later.md). Android is the initial release
target; iOS-specific StoreKit, widget, native build, and device QA remain future work.

## Documents by purpose

### Beginner operating guides

| Document | Purpose |
| --- | --- |
| [START-HERE.md](../START-HERE.md) | shortest first-run path |
| [01-windows-setup.md](./01-windows-setup.md) | install Node, Android Studio, Java, SDK, emulator, and `adb` |
| [02-run-mobile.md](./02-run-mobile.md) | launch, debug, Expo Go limitations, and native development builds |
| [troubleshooting.md](./troubleshooting.md) | common local, native, and cloud failures |
| [12-powershell-tools.md](./12-powershell-tools.md) | guided Windows commands with built-in help |

### Testing and release

| Document | Purpose |
| --- | --- |
| [testing.md](./testing.md) | test commands, device matrix, cloud/purchase QA |
| [quality-review.md](./quality-review.md) | implemented findings and remaining manual gates |
| [03-android-release.md](./03-android-release.md) | beginner package-ID, privacy, signing, AAB, Play fields, tracks, and rollout walkthrough |
| [Google Play submission pack](../store/android/README.md) | upload-ready graphics, listing copy, asset manifest, and declarations |
| [release-checklist.md](./release-checklist.md) | staged first-upload, Closed-test, and Production gates plus complete evidence list |
| [09-data-privacy-and-play-policy.md](./09-data-privacy-and-play-policy.md) | Data safety, health, content, and privacy declarations |
| [privacy-policy.md](./privacy-policy.md) | operator-fillable privacy policy |
| [07-ios-later.md](./07-ios-later.md) | later iPhone work |

### Optional cloud, operations, and money

| Document | Purpose |
| --- | --- |
| [08-cost-controls.md](./08-cost-controls.md) | authoritative flags, user-scale estimates, quotas, and emergency controls |
| [04-google-cloud.md](./04-google-cloud.md) | Firebase/GCP/Terraform deployment |
| [05-admin-dashboard.md](./05-admin-dashboard.md) | support, users, grants, roles, config, and hosting |
| [06-monetization.md](./06-monetization.md) | lifetime supporter purchase and free-access strategy |
| [security.md](./security.md) | threat model, dependencies, and operator controls |

### Product and engineering reference

| Document | Purpose |
| --- | --- |
| [11-feature-catalog.md](./11-feature-catalog.md) | authoritative implemented feature inventory |
| [00-product-plan.md](./00-product-plan.md) | product boundaries and implementation history |
| [10-experience-roadmap.md](./10-experience-roadmap.md) | completed polish rationale and deliberate deferrals |
| [architecture.md](./architecture.md) | technical architecture and privacy boundaries |

## Status vocabulary

- **Implemented** means code exists and automated checks cover it where practical.
- **Code-ready, device QA required** means native behavior still needs real Android
  hardware or an emulator.
- **Manual release step** means you must supply an account, legal value, console
  setting, credential-free permission, or store action.
- **Deliberately deferred** means it is not secretly unfinished; it was excluded
  for privacy, safety, cost, or scope reasons.

## Where the newest local-first features are documented

Use the [feature catalog](./11-feature-catalog.md) for exact behavior and data boundaries. The
[experience roadmap](./10-experience-roadmap.md) explains why Spark uses Simple mode, contextual
help, weekly planning, friction support, Leave on time, one-week changes, deliberate
sharing, and explicit calendar bridges. The [cost register](./08-cost-controls.md) confirms that
all of those features, encrypted folder backups, localization, diagnostics, shortcuts, and the
Focus widget have $0 Spark cloud runtime cost.
