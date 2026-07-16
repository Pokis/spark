# Spark

Spark is an Android-first, iPhone-compatible habit and focus tracker designed around small
wins, flexible consistency, and low-friction recovery.

The core application is offline-first. Habits, routines, completions, focus sessions,
rewards, and notes stay on the device in encrypted SQLite. Google Cloud is optional and is
limited to support conversations, purchase verification, crash/configuration services, and
the admin console.

If you are new to mobile development, begin with [START-HERE.md](./START-HERE.md).

## Repository map

- `apps/mobile` — Expo/React Native application for Android and iOS.
- `apps/admin` — optional static support and configuration dashboard.
- `packages/domain` — platform-independent scheduling, recommendation, rhythm, and reward logic.
- `packages/cloud-contracts` — shared API schemas with no secrets or platform dependencies.
- `services/control-plane` — scale-to-zero Cloud Run API.
- `infra/terraform` — conservative Google Cloud infrastructure defaults.
- `docs` — beginner-oriented setup, release, cloud, privacy, and troubleshooting guides.

## Cost boundary

Running the mobile app requires no server. Cloud functionality is opt-in and all production
defaults are designed to stay within Google Cloud/Firebase free quotas at small scale:

- Cloud Run minimum instances: `0`
- Cloud Run maximum instances: `2`
- no uploaded habit or health history
- no phone/SMS authentication
- no continuous database listeners in the dashboard
- paginated support and user queries
- configurable support-message rate limits

See [docs/08-cost-controls.md](./docs/08-cost-controls.md) before enabling billing.

## Documentation

- [Product and feature plan](./docs/00-product-plan.md)
- [Architecture and data boundaries](./docs/architecture.md)
- [Windows setup](./docs/01-windows-setup.md)
- [Run the mobile app](./docs/02-run-mobile.md)
- [Android release](./docs/03-android-release.md)
- [Optional Google Cloud deployment](./docs/04-google-cloud.md)
- [Admin dashboard](./docs/05-admin-dashboard.md)
- [Monetization and grants](./docs/06-monetization.md)
- [iPhone release later](./docs/07-ios-later.md)
- [Cost controls](./docs/08-cost-controls.md)
- [Privacy and Play policy](./docs/09-data-privacy-and-play-policy.md)
- [Testing](./docs/testing.md)
- [Security maintenance](./docs/security.md)
- [Troubleshooting](./docs/troubleshooting.md)
- [Release checklist](./docs/release-checklist.md)
