# Security maintenance

## Current dependency audit

The dependency audit was last reviewed on 2026-07-16.

`npm audit --omit=dev` reports one moderate advisory repeated across 21 transitive dependency
instances:
`GHSA-w5hq-g745-h8pq` in `uuid` versions earlier than 11.1.1. The affected operation is the
optional caller-supplied output buffer used by UUID v3, v5, and v6.

Spark does not call those APIs. The affected copies currently arrive through:

- Expo configuration tooling, including the configuration paths used by Expo, Expo Sharing,
  Splash Screen, and `xcode`; this is principally build/configuration tooling rather than Spark
  application logic.
- the latest compatible Firebase Admin / Google Cloud dependency chain used by the optional
  control plane.

The installed parent packages do not currently expose a non-breaking audit resolution.
Do not use `npm audit fix --force`: it can replace Expo or Firebase packages with incompatible
major versions. Dependabot is configured to check weekly. Re-run the commands below when those
parent packages publish compatible updates:

```powershell
npm.cmd audit --omit=dev
npm.cmd audit
npm.cmd outdated
```

## Reporting a vulnerability

Do not put secrets, purchase tokens, user identifiers, or private support messages in a public
issue. Send the project owner a private report containing the affected version, reproduction
steps, impact, and any suggested mitigation.

## Operational rules

- Never place service-account JSON in this repository.
- Use Cloud Run's service identity and Application Default Credentials.
- Keep Firestore client rules deny-by-default; all cloud data access goes through the API.
- Restrict admin access with the email allowlist and Firebase custom roles.
- Rotate any credential immediately if it appears in a log, screenshot, issue, or commit.
- Keep Play purchase verification server-side.
- Review admin audit events after grants, promo assignments, and role changes.
