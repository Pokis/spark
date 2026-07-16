# Spark privacy policy

Effective: July 16, 2026

Before publishing, replace every `REPLACE_ME` value, have the policy reviewed for the operator's
jurisdictions, and keep the hosted HTML and this document consistent.

## Summary

Spark is designed to work without an account or server. Habit names, schedules, completion
history, capacity check-ins, routines, focus sessions, and captured thoughts stay in an encrypted
database on the user's device. Spark does not sell personal information or use it for advertising.

## Operator

Spark is operated by:

`REPLACE_ME_LEGAL_NAME`  
`REPLACE_ME_POSTAL_ADDRESS`  
`REPLACE_ME_COUNTRY`  
Email: `REPLACE_ME@example.com`

## Information stored on the device

Spark stores the information needed to provide its habit, focus, capture, routine, reminder,
progress, preference, and entitlement-cache features. This data stays on the device unless the
user deliberately exports a backup.

The native app database uses SQLCipher encryption and a key stored through the operating
system's secure credential storage. No storage mechanism can guarantee security on a compromised
or unlocked device.

## Backups

Spark creates a backup only when the user selects Export. The backup is readable JSON and is not
separately encrypted. The user chooses the receiving application or destination and is
responsible for protecting and deleting that copy. Spark does not receive the backup.

## Optional cloud services

If the user chooses private support, purchase verification, a promo check, or another clearly
identified cloud feature, Spark may process:

- a random Firebase user identifier
- an email address if the identity is later linked
- support subject and message text submitted by the user
- app version and platform
- Google Play product ID, purchase token, and order metadata required to verify access
- entitlement status

Spark does not attach local habits, completions, capacity, focus titles, routines, or captured
thoughts to these requests.

## Purposes

Optional cloud information is used to:

- authenticate a private support conversation
- answer support requests
- verify and restore purchases
- issue or administer promo and manual access grants
- prevent fraud and abuse
- maintain security and operator audit records

## Service providers and sharing

Google Cloud, Firebase, and Google Play process information as service providers and platform
operators. Information may also be disclosed when required by law, to protect users or the
service, or as part of a lawful business transfer with appropriate notice and safeguards.

Spark does not sell or rent personal information and does not share it for behavioral advertising.

## Legal basis

Where required, processing is based on performing the requested support or purchase service,
legitimate interests in security and service operation, legal obligations, and consent for
optional features. The precise basis depends on the user's location and the operator's legal
review.

## Retention

`REPLACE_ME` with final periods. The implemented defaults and intended starting schedule are:

- support conversations: 90 days after the latest message by default
- anonymous cloud identities: until the user deletes the identity or the operator adopts an
  additional documented inactive-account policy
- promo assignment records: campaign reconciliation plus up to 180 days
- purchase and access-grant records: as required for fraud, tax, accounting, and legal obligations
- administrative security records: 365 days by default unless a longer legal need applies

Local data remains until the user deletes app storage or uninstalls the app.

## Deletion and rights

The user can delete optional cloud data from Spark Settings. This removes support conversations,
the cloud entitlement record, user record, and Firebase Authentication identity. Purchase,
promotion, and security records that must be retained for fraud, accounting, or legal purposes
are disconnected from the deleted Firebase identity by replacing that identifier with a random
deletion pseudonym. Local data is not removed by that action.

The user can remove local data by clearing Spark's app storage or uninstalling it. A backup can be
exported first.

Requests for access, correction, objection, restriction, portability, or deletion can be sent to
`REPLACE_ME@example.com`. Rights and response periods depend on applicable law. The operator may
need to verify that the requester controls the relevant support identity.

## International processing

Optional cloud information may be processed in the selected Google Cloud region and other
locations where Google or the operator's providers operate, subject to applicable transfer
safeguards.

## Children

Spark is not directed to children under the applicable age of digital consent. The operator does
not knowingly enable optional cloud collection from such children without appropriate
authorization and policy compliance.

## Security

Spark uses encrypted local storage in native builds, HTTPS, Firebase token verification,
least-privilege administrator roles, deny-all Firestore client rules, request limits, and audited
grant actions. No system can guarantee absolute security.

## Health disclaimer

Spark is an organization and self-management tool. It does not diagnose, treat, cure, or prevent
ADHD or any medical condition, and it is not a substitute for advice, diagnosis, or treatment
from a qualified professional.

## Changes

Material changes will update the effective date and, where appropriate, be announced in the app
or store listing.

## Contact

Privacy questions: `REPLACE_ME@example.com`
