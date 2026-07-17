# Optional Google Cloud setup

Do not follow this guide to run the habit tracker. Deploy cloud services only when you want
private support or verified premium access.

Read [08-cost-controls.md](./08-cost-controls.md) first. It is the authoritative register of
every billable capability, its default-off switch, and its approximate cost by user count.

**Current Spark status (July 17, 2026):** Firebase/Google project `djpokis-spark-habits` exists,
only the static Hosting site has been deployed, and
`https://djpokis-spark-habits.web.app/privacy.html` is live. Cloud Billing is disabled with no
billing account attached. Firestore, Cloud Run, Auth-backed app accounts, support, purchases,
remote config, scheduled jobs, monitoring, and image builds remain disabled. This section is for
future cloud activation; do not repeat project creation for the offline release.

## Recommended shape

Use one dedicated Firebase-enabled Google Cloud project:

- region: `europe-central2` (Warsaw)
- Firestore: one `(default)` native database
- Cloud Run: `min=0`, `max=2`, 512 MiB
- Firebase Hosting: static admin and privacy page
- Firebase Auth: Anonymous for mobile; Google for admins
- Artifact Registry: one repository with untagged-image cleanup
- optional Pub/Sub RTDN topic and authenticated push subscription, disabled by default
- optional Cloud Scheduler nightly retention cleanup request, disabled by default
- optional uptime/5xx monitoring, disabled by default to preserve scale-to-zero

Firestore location is immutable. If most eventual users will be far from Europe, review the
choice before creating the database. Support latency is not critical, so a nearby regional
location is usually cheaper and simpler than multi-region.

## Credits

Firebase uses the same Google Cloud project and billing account. Eligible usage can generally
consume Google Cloud credits after no-cost quotas, but credit scope and expiration vary. Confirm
your credit terms in Cloud Billing; do not assume every marketplace or third-party charge is
covered.

## Zero-cost local cloud development

Before creating a real project, use the Firebase emulators:

```powershell
Copy-Item services/control-plane/.env.example services/control-plane/.env
Copy-Item apps/admin/.env.example apps/admin/.env.local
```

Edit `apps/admin/.env.local` and set `VITE_SPARK_ADMIN_ENABLED=true`. This explicitly opts the
local dashboard into making emulator/API requests; it remains `false` in the committed example.

Start Auth/Firestore/Hosting, wait for readiness, then seed and run the apps:

```powershell
.\spark.cmd emulators
.\spark.cmd seed
.\spark.cmd api
.\spark.cmd admin
```

The local account is `owner@spark.local` / `SparkLocalOnly123!`. The seeder accepts only a
`demo-*` project and localhost endpoints. This follows Firebase's recommendation to use demo
projects where possible because they cannot fall through to billable production resources.

## 1. Project and local tooling

The dedicated project is already `djpokis-spark-habits`. Do not create a second project or link
billing for the initial release. Link billing only after explicitly approving a costed cloud
feature that needs it; the mobile app still runs without billing.

Install:

- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
- [Terraform](https://developer.hashicorp.com/terraform/install)

Then:

```powershell
.\spark.cmd deploy -Action Login -Provider Google -ProjectId djpokis-spark-habits
```

The wrapper runs both Google Cloud CLI and Application Default Credentials authentication, then
selects the exact project. On Windows it uses `gcloud.cmd`, avoiding the script-policy problem
that can affect PowerShell shims.

The ignored `infra\terraform\terraform.tfvars` file has already been prepared on this PC with the
real project, operator email, Hosting origin, package ID, and every cost-bearing switch off. On a
fresh clone only, create it if it is missing:

```powershell
if (-not (Test-Path infra\terraform\terraform.tfvars)) {
  Copy-Item infra\terraform\terraform.tfvars.example infra\terraform\terraform.tfvars
}
```

Edit `terraform.tfvars`. For the first planning run, leave every cost-bearing switch off:

```hcl
enable_cloud_runtime        = false
enable_google_play_rtdn     = false
enable_maintenance_job      = false
enable_synthetic_monitoring = false
container_image             = ""
```

This first plan creates only the Firebase project binding, enables APIs, and optionally creates a
budget alert. Enabling an API does not itself create usage.

When you are deliberately ready to create Firestore and Artifact Registry, set
`enable_cloud_runtime = true`, keep `container_image = ""`, review the plan, and apply again.
Do not set the master switch back to `false` after real data exists without carefully reviewing
the destruction plan; normal on/off control happens through the individual app-config switches.

```powershell
.\spark.cmd deploy -Action Status
.\spark.cmd deploy -Action Plan
```

`Status` is read-only. `Plan` initializes Terraform, checks formatting, validates configuration,
saves `infra/terraform/spark.tfplan`, and prints it. It does not apply changes. Review the complete
plan, especially every create/destroy marker and the cost-bearing flags, then run:

```powershell
.\spark.cmd deploy -Action Apply
```

Apply shows the saved plan again, rejects it if Terraform inputs changed afterward, and requires
typing `APPLY <project-id>`. Passing `-Yes` is intended only for controlled automation.

If the project was already added to Firebase or already has Firestore, import those resources
into Terraform instead of creating duplicates. Never delete a production Firestore database to
make Terraform happy.

## 2. Configure Firebase Authentication

In Firebase Console:

1. Open **Authentication → Sign-in method**.
2. Enable **Anonymous**.
3. Enable **Google** and set a support email.
4. Under **Settings → Authorized domains**, keep only the needed local and Hosting domains.

Anonymous identities are created only when a person uses a cloud feature.

## 3. Create a Firebase web app

Create one Firebase web app for the admin dashboard. Copy its public config values into:

```text
apps/admin/.env.local
```

Use:

```text
VITE_SPARK_ADMIN_ENABLED=true
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_SPARK_API_URL=
```

Firebase web API keys identify the project; they are not service-account secrets. Protection
comes from Authentication, API authorization, App Check if later needed, and Firestore's deny-all
client rules.

## 4. Build the API image

From the repository root:

```powershell
.\spark.cmd deploy -Action Image -ProjectId djpokis-spark-habits
```

The wrapper tests/builds the API locally, prints the full image URI, warns about Cloud Build and
Artifact Registry cost, and requires typing `BUILD IMAGE <project-id>`. It uses the mobile version
as the tag unless `-ImageTag` is supplied.

Put the resulting image URI in `terraform.tfvars`, then create and review a new plan:

```powershell
.\spark.cmd deploy -Action Plan
.\spark.cmd deploy -Action Apply
```

Terraform outputs the Cloud Run URL. Add it to `apps/admin/.env.local` and
`apps/mobile/.env.local`. Configure the same mobile values in the EAS build environment before a
cloud build.

The mobile build also needs this explicit opt-in before it requests remote configuration:

```text
EXPO_PUBLIC_SPARK_REMOTE_CONFIG_ENABLED=true
```

Leave it `false` for offline-only builds. When false, Spark ignores even an old cached remote
configuration and uses baked, all-off cloud defaults.

## 5. Bootstrap the first owner

Set `admin_email_allowlist` in Terraform to your Google account email, apply, and sign in to the
dashboard. In **Admins**, assign yourself the `owner` custom claim. Sign out and in, then remove
the Terraform allowlist and apply again.

The allowlist is an environment variable, not a long-term role database.

## 6. Deploy Firestore rules, indexes, admin, and privacy page

Authenticate once, then deploy to an explicit project ID:

```powershell
.\spark.cmd deploy -Action Login -Provider Firebase
.\spark.cmd deploy -Action Firebase -ProjectId djpokis-spark-habits
```

The Firebase action runs the release/privacy check and admin build first, then deploys only
Hosting, Firestore rules, and Firestore indexes after typed confirmation. Use `-Action Hosting`
instead when you only want the static privacy/admin site and do not want to deploy Firestore
configuration.

Use the resulting Hosting URL in `allowed_origins`, apply Terraform, and confirm the dashboard can
load.

## 7. Connect Google Play

The Cloud Run service account appears in Terraform output. In Play Console, grant it the smallest
API permissions that permit purchase lookup and acknowledgement. Do not create or download a JSON
key. Cloud Run automatically supplies its service-account identity.

Terraform also outputs `google_play_rtdn_topic`. In Play Console:

1. open **Monetize → Monetization setup**;
2. paste that full Pub/Sub topic in **Real-time developer notifications**;
3. enable one-time product notifications;
4. send a test notification;
5. confirm a `204` request and structured `purchase.rtdn.*` log in Cloud Run.

The topic grants publisher access only to Google's Play notification service account. Pub/Sub
pushes to `/v1/internal/google-play/rtdn` with an OIDC token from Spark's dedicated internal
invoker. The same identity calls `/v1/internal/maintenance` nightly through Cloud Scheduler.

Neither integration exists by default. Before applying, set only the integration you are actively
testing:

```hcl
enable_google_play_rtdn = true
enable_maintenance_job  = true
```

RTDN should be enabled before paid production release. The maintenance job should be enabled once
support or admin audit records are being retained.

## 8. Turn on features

In the admin dashboard:

1. Open **App config**; it is the dashboard's initial page on a new deployment.
2. Enable **Admin role management**, assign the durable owner, then remove the bootstrap allowlist.
3. Enable **User and operations review** only if you need overview/user/audit pages.
4. Enable **Support**, then test one conversation.
5. Enable **Manual grants** or **Promo codes** only while testing those workflows.
6. Create the Play product and run an internal test purchase.
7. Enable **Purchases and restore** last.
8. Enable **Global announcements** only when a real announcement is ready.

Cloud config is enforced by the API, not only the UI. Allow up to 30 seconds for the config cache
on another scaled instance to observe an emergency change.

Keep `enable_synthetic_monitoring = false` while the service is unused. Set it to `true` and
provide `alert_email` only when public support or purchases justify a five-minute readiness probe
that wakes the scale-to-zero service.

## Why the Cloud Run service is public

Mobile devices and the static dashboard must reach its HTTPS URL. “Public” at the Cloud Run IAM
edge means requests can arrive; all non-config routes still require a valid Firebase token, and
admin routes require a role. This avoids embedding a server credential in the app.
