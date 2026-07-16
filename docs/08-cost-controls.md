# Costed features, switches, and expected spend

Pricing checked: **2026-07-16**. Currency: **USD**. Cloud prices and Google Play
fees can change, so re-check the linked official pages before a production launch.

This is Spark's authoritative cost register. Every implemented capability that can
cause a third-party bill is listed here with its switch, default, usage assumption,
and approximate cost. The feature catalog links back to this register rather than
repeating estimates in multiple places.

## The safe default

An offline Android or iPhone build costs **$0/month in cloud runtime**. Habits,
completions, reminders, focus, soundscapes, Capture, routines, widgets, insights,
backups, and all accessibility features stay on the device.

There are two independent controls for optional cloud behavior:

1. Terraform must explicitly create the cloud runtime with
   `enable_cloud_runtime = true`. Its default is `false`.
2. Each product capability must then be explicitly enabled. All product switches
   use baked `false` defaults.

A Cloud Run URL by itself therefore does not turn features on.

## Switch register

| Cost-bearing capability | Switch or control | Default | Where to change it |
| --- | --- | --- | --- |
| Cloud Run, Firestore, and Artifact Registry foundation | `enable_cloud_runtime` | `false` | `infra/terraform/terraform.tfvars` and `terraform apply` |
| Mobile remote-config checks | `EXPO_PUBLIC_SPARK_REMOTE_CONFIG_ENABLED` | `false` | mobile `.env.local` or EAS build environment; requires a new app build |
| Global announcements | `announcementsEnabled` | `false` | Admin → App config |
| Private support | `supportEnabled` | `false` | Admin → App config |
| Purchase verification and restore | `purchasesEnabled` | `false` | Admin → App config |
| User/overview/audit review | `userReviewEnabled` | `false` | Admin → App config |
| Manual supporter grants | `manualGrantsEnabled` | `false` | Admin → App config |
| Play promo inventory | `promoCodesEnabled` | `false` | Admin → App config |
| Admin-role changes | `adminRolesEnabled` | `false` | Admin → App config |
| Admin web application | `VITE_SPARK_ADMIN_ENABLED` | `false` | admin `.env.local`; also do not deploy Hosting until wanted |
| Google Play RTDN | `enable_google_play_rtdn` | `false` | Terraform variables and apply |
| Nightly retention cleanup | `enable_maintenance_job` | `false` | Terraform variables and apply |
| Five-minute uptime and 5xx monitoring | `enable_synthetic_monitoring` | `false` | Terraform variables and apply |
| Email monitoring channel | `alert_email` | blank | Terraform variables and apply |
| Billing alerts | `billing_account_id` | blank | Terraform variables and apply |
| Manual GitHub cloud deployment | `deploy_api` / `deploy_admin` workflow inputs | both `false` | GitHub Actions manual dispatch |
| EAS cloud builds | operational choice | unused by default | use local Android builds, or deliberately invoke EAS |
| Google Play sales fees | controlled by `purchasesEnabled` and whether a product is sold | no sales | Play Console and Admin → App config |

The API enforces support, purchase, user-review, grant, promo, and role switches;
they are not merely hidden in the UI. Configuration remains reachable so an owner
can turn a disabled capability on. The API refreshes its configuration within about
30 seconds on each active Cloud Run instance. Mobile devices normally refresh
configuration once per 24 hours.

`enable_cloud_runtime` is a deployment gate, not the normal emergency switch.
After production data exists, do not set it to `false` without reviewing the
Terraform destruction plan. Use the product switches first; they preserve data and
stop normal feature traffic.

## Estimation assumptions

The estimates below use deliberately simple, inspectable assumptions:

- 30 days per month;
- one remote-config request per enabled installed device per day;
- Cloud Run request-based billing, 1 vCPU, 512 MiB, concurrency 40, `min=0`,
  `max=2`;
- 5% of users open one support thread per month, with four messages and roughly
  ten API requests per participating user;
- 2% of users buy one $9.99 lifetime product, with roughly four API requests per
  buyer;
- 1% receive a manual grant or promo assignment;
- two operators use the dashboard a few times each week;
- no habit, focus, routine, Capture, or completion data is uploaded.

The rows are **incremental estimates and are not additive** because Cloud Run,
Firestore, Auth, and their free quotas are shared.

## Approximate monthly cost by feature and total users

| Feature | 100 users | 1,000 users | 10,000 users | 50,000 users | Main reason |
| --- | ---: | ---: | ---: | ---: | --- |
| Offline mobile product | $0 | $0 | $0 | $0 | No server or paid API |
| Cloud foundation while idle | $0–$0.10 | $0–$0.10 | $0–$0.10 | $0–$0.10 | Scale-to-zero; possible container storage above 0.5 GiB |
| Remote config and announcements | $0 | $0 | $0 | $0–$1 | 3,000 to 1.5M small requests/month; shared config is cached |
| Private support | $0 | $0 | $0 | $0–$1 | About 5 to 2,500 participating users; bounded reads/writes |
| Purchase verification/restore cloud work | $0 | $0 | $0 | $0–$1 | About 2 to 1,000 buyers; Play fee is separate below |
| User, overview, and audit review | $0 | $0 | $0 | $0–$0.25 | Operator-driven bounded pages, not per-user polling |
| Manual grants | $0 | $0 | $0 | $0–$0.25 | Roughly 1 to 500 small writes plus audits |
| Promo-code inventory | $0 | $0 | $0 | $0–$0.25 | Roughly 1 to 500 assignments plus audits |
| Admin role management | $0 | $0 | $0 | $0–$0.25 | Rare Auth/admin writes plus audits |
| Static admin/privacy Hosting | $0 | $0 | $0 | $0 expected | Operator traffic should stay far below 10 GB/month |
| Google Play RTDN | $0 | $0 | $0 | $0 expected | Tiny messages; first 10 GiB Pub/Sub throughput is free |
| One nightly maintenance job | $0 expected | $0 expected | $0 expected | $0 expected | Three Scheduler jobs are free per billing account; otherwise $0.10/job/month |
| Uptime/5xx monitoring | $0–$1 | $0–$1 | $0–$1 | $0–$1 | Uptime allowance is large; the checks also wake Cloud Run |
| Combined enabled-cloud planning range | $0–$0.25 | $0–$0.50 | $0–$2 | $0–$5 | Shared free quotas mean the feature rows should not be summed |

At these assumptions, the expected Google Cloud bill is normally **$0 to a few
dollars per month through 50,000 users**, not including store fees. The range exists
because free quotas are shared across projects on a billing account, request latency
varies, abusive traffic is possible, and regional/network pricing can change.

### Authentication threshold

Email, social, and anonymous Identity Platform users currently have a 50,000 MAU
free tier. If every one of 50,000 users signs into a cloud feature, the estimated
Auth charge is still $0. From 50,000 to 100,000 MAU, the current rate is $0.0055 per
additional MAU, so 100,000 cloud-active users would be about **$275/month** for
Authentication alone. Spark avoids creating an identity until a cloud feature is
used.

### Google Play transaction fee illustration

The Play fee is deducted from sales revenue; it is not a Google Cloud charge and
Google Cloud credits do not cover it. Google introduced more region/install/program
specific fee rules for EEA, UK, and US transactions from June 30, 2026, so the
actual fee must be checked in your Play account.

The table below is only a planning illustration using a 15% effective fee, a $9.99
product, and 2% buyers:

| Total users | Buyers | Gross sales | Illustrative 15% Play fee |
| ---: | ---: | ---: | ---: |
| 100 | 2 | $19.98 | $3.00 |
| 1,000 | 20 | $199.80 | $29.97 |
| 10,000 | 200 | $1,998.00 | $299.70 |
| 50,000 | 1,000 | $9,990.00 | $1,498.50 |

Taxes, refunds, currency conversion, chargebacks, and the exact applicable Play
program are excluded.

## Infrastructure and deployment charges

These depend on deployments rather than user count:

| Item | Current allowance/rate | Spark expectation and control |
| --- | --- | --- |
| Cloud Run | 2M requests, 180k vCPU-seconds, and 360k GiB-seconds free monthly for request-based services | Usually $0 at small scale; `min=0`, `max=2`; no service exists until cloud runtime and image are enabled |
| Firestore | 50k reads/day, 20k writes/day, 20k deletes/day, 1 GiB storage, 10 GiB outbound monthly | Usually $0; one default database, bounded queries, no habit sync |
| Firebase Hosting | 10 GB storage and 10 GB transfer monthly free; Blaze overage currently $0.026/GB storage and $0.15/GB transfer | Usually $0; do not deploy admin Hosting until wanted |
| Identity Platform | 50k Tier-1 MAU free, then tiered per-MAU pricing | Usually $0; identity is lazy and no phone/SMS auth is used |
| Pub/Sub | First 10 GiB Message Delivery Basic throughput per billing account free; then $40/TiB | RTDN should remain $0; separately disabled |
| Cloud Scheduler | Three jobs/month per billing account free; then $0.10/job/month | One job, separately disabled |
| Artifact Registry | First 0.5 GiB-month free; roughly $0.10/GiB-month after that | A 1 GiB retained image is about $0.05/month; untagged images older than 14 days are deleted |
| Cloud Build | 2,500 free `e2-standard-2` build-minutes per billing account/month; then currently $0.006/minute | Normal occasional releases should be $0; builds are manual |
| Monitoring uptime checks | First 1M executions/project/month, then $0.30/1,000 | Expected $0, but checks intentionally wake Cloud Run |
| Monitoring alert policy | Google lists $0.35/month per metric reference plus query points effective September 1, 2026 | Allow about $0.35+ monthly for the one 5xx condition after that date |
| Cloud Logging | First 50 GiB/project/month currently free; then $0.50/GiB for standard log-bucket ingestion | Shared `enable_cloud_runtime` control; structured logs are small and default retention is used |
| EAS Build | Current Free plan lists 15 Android and 15 iOS builds | Optional; local Android builds avoid this dependency entirely |

Official pricing:

- [Cloud Run](https://cloud.google.com/run/pricing)
- [Firestore](https://cloud.google.com/firestore/pricing)
- [Firebase Hosting](https://firebase.google.com/docs/hosting/usage-quotas-pricing)
- [Identity Platform](https://cloud.google.com/identity-platform/pricing)
- [Pub/Sub](https://cloud.google.com/pubsub/pricing)
- [Cloud Scheduler](https://cloud.google.com/scheduler/pricing)
- [Artifact Registry](https://cloud.google.com/artifact-registry/pricing)
- [Cloud Build](https://cloud.google.com/build/pricing)
- [Google Cloud Observability](https://cloud.google.com/products/observability)
- [Expo plans](https://expo.dev/pricing)
- [Google Play service fees](https://support.google.com/googleplay/android-developer/answer/112622)

## Cost controls already enforced

- no cloud resources in the normal mobile development path;
- all costed product switches default to `false`;
- remote-config checks ignore even previously cached cloud values when the build
  flag is off;
- the admin web app stays inert until its build flag is true;
- Cloud Run scales to zero and is capped at two instances;
- 30-second API timeout, concurrency 40, bounded body size, and route rate limits;
- cursor-paginated admin queries with no real-time listeners;
- no phone/SMS auth, Cloud Storage, analytics SDK, ads, AI API, or cloud habit sync;
- RTDN, retention scheduling, and synthetic monitoring have separate Terraform
  flags and default to off;
- old untagged containers are automatically removed;
- support and audit records have bounded retention fields;
- optional budget alerts fire at 50%, 90%, and 100% of the configured amount.

## Budget and emergency procedure

A Cloud Billing budget is an alert, **not a hard cap**, and reporting can be
delayed. See [Cloud Billing budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets).

If spending rises:

1. In Admin → App config, disable announcements, support, purchases, user review,
   grants, promo tools, and role changes as applicable.
2. Set `enable_google_play_rtdn`, `enable_maintenance_job`, and
   `enable_synthetic_monitoring` to `false`, review `terraform plan`, and apply.
3. Inspect Billing by service/SKU and Cloud Run logs by route.
4. Reduce Cloud Run `max_instance_count` to `1` if needed.
5. As an incident stop, remove Cloud Run public invoker access or set
   `container_image = ""` and apply. This stops legitimate traffic too.
6. Do not disable billing casually; resources can stop and may eventually be
   removed.

For a first Android release, the recommendation remains: ship and test the complete
offline product first, then enable only the cloud capability you are actively
testing.
