# Confirmed Android release decisions

Recorded July 17, 2026 from the publisher's direct answers. This file contains only information
the publisher approved for public use; it contains no password, API key, keystore, billing data,
or private service-account material.

| Area | Decision |
| --- | --- |
| Permanent Android/iOS identity | `com.djpokis.sparkhabits.app` |
| Store name | Spark ADHD Habit Tracker |
| Publisher type | Individual |
| Play developer and legal operator name | Domantas Judeikis |
| Public postal address | Kolektyvo g. 266, Vilnius, LT8350, Lithuania |
| Public privacy/support email | `djpokis@gmail.com` |
| Policy details in Git | Approved |
| Policy effective date | First publication; prepared July 17, 2026 |
| Retention | Support 90 days; promo up to 180 days; admin security 365 days; cloud identity until deletion; purchases as legally required |
| Privacy hosting | Live at `https://djpokis-spark-habits.web.app/privacy.html` from Firebase Hosting project `djpokis-spark-habits`; no other runtime enabled |
| Google Cloud billing | Disabled; no billing account attached when verified July 17, 2026 |
| Expo account/project | `@djpokis-team/spark-adhd-habits`; EAS project ID `d13c96e7-3533-4fdb-88da-48e0b5a4f932` |
| Android build path | Local Windows/Gradle build through `spark.cmd`; EAS is optional and unused by default |
| Local upload-key alias/path | `spark-upload`; ignored file `apps/mobile/credentials/spark-upload.p12` |
| Default Play language | English |
| Additional listings | Every language bundled by Spark |
| Price | Free initial app download |
| Audience | 18+ only; not directed to children |
| Countries | All Play-available countries/regions, subject to console eligibility and law |
| Health declaration | Stress Management, Relaxation, Mental Acuity; non-clinical planning/self-management |
| Initial network features | Cloud account/sync, support chat, remote config, analytics, crash upload, ads, purchases, and creator tip all disabled |

## Values that still come from authenticated services or private local setup

- The local upload-key file/password and its certificate fingerprint. They belong in LastPass,
  never in Git; they do not come from EAS.
- Google Play application ID/track state, tester list, content-rating result, and submitted form
  attestations.

These values should be discovered through the signed-in CLI or console. Never paste account
passwords, recovery codes, keystores, or service-account JSON into this file.
