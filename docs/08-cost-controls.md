# Cost controls and expected runtime cost

Pricing changes. The figures below were checked on July 16, 2026; verify the linked official pages
before deployment.

## Short answer

| Situation | Expected Spark cloud runtime |
|---|---:|
| Mobile app only, no Firebase/GCP deployment | **USD 0/month** |
| Private Android testing, cloud disabled | **USD 0/month** |
| Small support/purchase beta using the provided limits | **Usually USD 0/month** within no-cost quotas |
| Larger usage or abusive traffic | Variable; billing is enabled, so quotas and monitoring matter |

This excludes the developer accounts you already own, store transaction fees, optional EAS paid
plans, a domain name, and your own labor.

## Why the small beta should stay free

Current no-cost quotas include:

- Cloud Run request billing: 2 million requests, 180,000 vCPU-seconds, and 360,000 GiB-seconds per
  month; Warsaw is listed among eligible regions
- Firestore: 50,000 document reads, 20,000 writes, and 20,000 deletes per day, 1 GiB stored, and
  10 GiB outbound per month for one database
- Firebase Hosting: 10 GB stored and 10 GB data transfer per month
- Firebase Authentication: most methods are no-cost; on Blaze with Identity Platform, the
  no-cost tier is 50,000 monthly active email/social/anonymous/custom users

Official sources:

- [Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Firestore pricing and free quota](https://firebase.google.com/docs/firestore/pricing)
- [Firebase Hosting quota and pricing](https://firebase.google.com/docs/hosting/usage-quotas-pricing)
- [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Firebase Authentication limits](https://firebase.google.com/docs/auth)

## Approximate scenarios

Assumptions:

- the app checks config once per day, not every launch
- most people never use cloud support
- each support message is a handful of Firestore operations
- Cloud Run responses are small and fast
- no habit data sync

| Monthly active installs | Daily config requests | Support activity | Likely result |
|---:|---:|---:|---|
| 100 | 100 | 20 threads/month | comfortably no-cost |
| 1,000 | 1,000 | 100 threads/month | comfortably no-cost |
| 10,000 | 10,000 | 500 threads/month | likely no-cost, monitor daily Firestore reads |
| 50,000 | 50,000 | material | config alone reaches Firestore's daily free-read boundary; add CDN/cache redesign |

These are architecture estimates, not a price guarantee.

## Controls already in code

- mobile is fully functional without an API URL
- Cloud Run minimum instances `0`
- Cloud Run maximum instances `2`
- 512 MiB memory, one vCPU, request-based billing, CPU idle
- concurrency `40`
- 30-second timeout
- 64 KB JSON bodies
- global and support-specific rate limits
- one config fetch per device per 24 hours
- at most 100 rows in admin lists
- no dashboard real-time listeners
- no phone/SMS auth
- no Cloud Storage bucket
- no scheduled function
- no AI API
- Artifact Registry removes untagged images older than 14 days
- Terraform can create a USD 5 monthly alert at 50%, 90%, and 100%

## Budget warning

A Google Cloud budget is an alert, **not a hard cap**. Reporting can be delayed. Google explicitly
warns that a budget does not automatically stop usage or charges:
[Cloud Billing budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets).

The safer controls are service quotas, maximum instances, rate limits, and keeping optional
features off until needed.

## Deployment costs that can surprise you

- Artifact Registry storage if old images accumulate
- Cloud Build minutes during frequent deployments
- outbound Cloud Run traffic
- Firestore index/storage growth from unreconciled support and audit history
- Authentication above the no-cost MAU tier
- Firebase Hosting traffic if the privacy/admin site becomes unexpectedly popular
- purchase-refund notification infrastructure added later

The cleanup policy handles untagged container images. Review Firestore retention and Hosting
releases monthly.

## Emergency procedure

If spending rises unexpectedly:

1. Disable support and purchases in app config.
2. Set Cloud Run maximum instances to `1` or remove public invoker access.
3. Inspect Cloud Billing by service and SKU.
4. Inspect Cloud Run request logs for abusive paths and IP patterns.
5. Lower quotas or deploy a stricter rate limit.
6. Do **not** disable billing casually; Google warns resources can stop and may eventually be
   deleted.

## Recommendation

Release the offline Android app first. Do not deploy cloud for the first hands-on test. Add the
control plane immediately before support or monetization testing. At that scale, your likely
runtime bill is zero or cents, and your monthly credits should cover eligible charges—but keep
the budget and maximum-instance protections anyway.
