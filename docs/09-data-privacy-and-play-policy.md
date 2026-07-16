# Data privacy and Google Play policy

This is an engineering and product checklist, not legal advice.

## Data map

| Data | Default location | Cloud only when | Admin visible |
|---|---|---|---|
| Habit names, variants, schedule, cues | encrypted device database | never | no |
| Completion history and capacity | encrypted device database | never | no |
| Focus titles and interruptions | encrypted device database | never | no |
| Capture text and routines | encrypted device database | never | no |
| JSON backup | user-chosen file destination | user places it there | no |
| Random support identity | Firebase Auth | support/purchase used | UID |
| Support text | Firestore | user sends it | yes |
| App/platform version | Firestore | support/purchase used | yes |
| Play purchase token/order metadata | Google Play and Firestore entitlement/audit | purchase verified | limited |
| Admin actions | Firestore audit | cloud deployed | authorized admins |

## Data minimization rules for future code

Do not add habit, focus, capacity, or capture fields to:

- support payloads
- crash breadcrumbs
- analytics events
- API logs
- push notification payloads
- remote configuration
- admin search

Treat free-form text as sensitive even if it is not formally health data.

## Account and deletion behavior

Spark has no required account. An optional anonymous cloud identity can be deleted from
**Settings → Delete optional cloud data**. The API recursively removes its support threads,
entitlement record, user record, and Firebase Auth identity. Retained purchase, promotion,
message-author, and audit identifiers are replaced with a random deletion pseudonym. Local data
is deliberately unchanged.

Uninstalling the app or clearing app storage removes local data and the database key. Export a
backup first if desired.

## Retention recommendation

Before production, adopt and publish exact periods. The implemented defaults and a conservative
starting point are:

- support conversations: delete 90 days after the latest message by default
- unused anonymous identities: retain until user deletion unless an additional automated policy
  is deliberately adopted and disclosed
- assigned promo inventory: retain until campaign reconciliation plus 180 days
- purchase/grant audits: retain for the legal/accounting period required in your jurisdiction
- general admin audit: delete after 365 days by default

Spark avoids billable Firestore TTL operations. When cloud records are retained, the operator
enables one authenticated nightly Cloud Scheduler request to delete expired support threads,
audit records, and RTDN deduplication records in bounded batches. Its Terraform flag is off by
default for an offline release. Continue a monthly owner review for purchase, grant, and promo
records whose retention depends on legal or campaign decisions.

## Google Play Data safety

Answer based on the released binary, not this plan. Likely disclosures when cloud is enabled:

- app activity/other user-generated content: support messages, collected only when submitted
- app information and performance: app/platform version used for support
- financial info/purchase history: Play manages purchases; Spark verifies entitlement
- user IDs: random Firebase UID

State that local habit and health-related content is not collected by the developer. Verify every
third-party SDK's behavior and current Play definitions.

## Health policy positioning

Spark is designed for executive-function challenges associated with ADHD, which may place it
within Google's broad health/wellness scope even though it is not medical.

Required precautions:

- complete the Health apps declaration for every published track
- use a public HTML privacy policy in Play Console and in-app
- clearly state the purpose and intended users
- include the non-medical disclaimer
- make no diagnosis, treatment, cure, or prevention claim
- do not claim clinical efficacy without appropriate evidence
- do not request Health Connect, body-sensor, location, accessibility-service, or medication data
  unless a future core feature and policy review justify it
- check whether the developer account must be an Organization account

Use the current policy text:

- [Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291)
- [Health app categories](https://support.google.com/googleplay/android-developer/answer/13996367)
- [Health content and services](https://support.google.com/googleplay/android-developer/answer/16679511)
- [Play Console requirements](https://support.google.com/googleplay/android-developer/answer/10788890)

## Notifications

Spark asks after an explicit settings choice, creates a low-importance named channel, remains
quiet by default, and caps scheduled habits. It does not request exact-alarm permission.

Do not use push notifications for engagement campaigns. If support-reply push is added, include
only “You have a support reply,” never the message text.

## Security incident basics

Before cloud production:

1. Assign a security contact.
2. Enable Cloud Audit Logs and review IAM.
3. Test cross-user support access.
4. Test role revocation.
5. Document credential and signing-key recovery.
6. Prepare a process to disable support/purchases remotely.
7. Prepare user notification and regulator assessment steps appropriate to the operator's
   jurisdiction.
