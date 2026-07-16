# Spark documentation home

Start here when you are unsure which document to open. The files are grouped by
task below; you do not need to read the repository front to back.

## If you only read five documents

1. [START-HERE.md](../START-HERE.md) — first commands and the shortest beginner path.
2. [Run the mobile app](./02-run-mobile.md) — Expo Go, Android emulator/device, and debugging.
3. [Testing](./testing.md) — automated checks and the device test matrix.
4. [Android release](./03-android-release.md) — signed build and Play Console walkthrough.
5. [Release checklist](./release-checklist.md) — final go/no-go list.

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
notifications, billing, accessibility, SQLCipher, sound, and Android process death.

### I want to release the free Android app

1. [Android release guide](./03-android-release.md)
2. [Privacy and Google Play policy preparation](./09-data-privacy-and-play-policy.md)
3. [Privacy-policy template](./privacy-policy.md)
4. [Release checklist](./release-checklist.md)

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

### Testing and release

| Document | Purpose |
| --- | --- |
| [testing.md](./testing.md) | test commands, device matrix, cloud/purchase QA |
| [quality-review.md](./quality-review.md) | implemented findings and remaining manual gates |
| [03-android-release.md](./03-android-release.md) | Android signing, AAB, tracks, and rollout |
| [release-checklist.md](./release-checklist.md) | final go/no-go gate |
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
