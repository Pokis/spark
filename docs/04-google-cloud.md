# Optional Google Cloud setup

Do not follow this guide to run the habit tracker. Deploy cloud services only when you want
private support or verified premium access.

## Recommended shape

Use one dedicated Firebase-enabled Google Cloud project:

- region: `europe-central2` (Warsaw)
- Firestore: one `(default)` native database
- Cloud Run: `min=0`, `max=2`, 512 MiB
- Firebase Hosting: static admin and privacy page
- Firebase Auth: Anonymous for mobile; Google for admins
- Artifact Registry: one repository with untagged-image cleanup
- Pub/Sub: one RTDN topic and authenticated push subscription
- Cloud Scheduler: one nightly retention cleanup request
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

Start Auth/Firestore/Hosting, wait for readiness, then seed and run the apps:

```powershell
npm.cmd run emulators
npm.cmd run emulators:seed
npm.cmd run api
npm.cmd run admin
```

The local account is `owner@spark.local` / `SparkLocalOnly123!`. The seeder accepts only a
`demo-*` project and localhost endpoints. This follows Firebase's recommendation to use demo
projects where possible because they cannot fall through to billable production resources.

## 1. Create a project

Choose a unique project ID in Google Cloud Console. Link billing only when ready to deploy Cloud
Run. The mobile app still runs without billing.

Install:

- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
- [Terraform](https://developer.hashicorp.com/terraform/install)

Then:

```powershell
gcloud.cmd auth login
gcloud.cmd auth application-default login
gcloud.cmd config set project YOUR_PROJECT_ID
```

On Windows, `gcloud.cmd` avoids the same PowerShell script-policy problem that can affect
`npm.ps1`.

Copy Terraform variables:

```powershell
Copy-Item infra\terraform\terraform.tfvars.example infra\terraform\terraform.tfvars
```

Edit `terraform.tfvars`. Start with `container_image = ""`; this creates the Firebase project
binding, APIs, Firestore, repository, RTDN topic, IAM, and optional budget without Cloud Run.

```powershell
Set-Location infra\terraform
terraform init
terraform fmt -check
terraform validate
terraform plan
terraform apply
Set-Location ..\..
```

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
$project = "YOUR_PROJECT_ID"
$region = "europe-central2"
$image = "$region-docker.pkg.dev/$project/spark/control-plane:0.1.0"

gcloud.cmd builds submit --config cloudbuild.yaml --substitutions "_IMAGE=$image" .
```

Put the resulting image URI in `terraform.tfvars`, then apply again:

```powershell
Set-Location infra\terraform
terraform apply
Set-Location ..\..
```

Terraform outputs the Cloud Run URL. Add it to `apps/admin/.env.local` and
`apps/mobile/.env.local`. Configure the same mobile values in the EAS build environment before a
cloud build.

## 5. Bootstrap the first owner

Set `admin_email_allowlist` in Terraform to your Google account email, apply, and sign in to the
dashboard. In **Admins**, assign yourself the `owner` custom claim. Sign out and in, then remove
the Terraform allowlist and apply again.

The allowlist is an environment variable, not a long-term role database.

## 6. Deploy Firestore rules, indexes, admin, and privacy page

Copy `.firebaserc.example` to `.firebaserc` and replace the project ID:

```powershell
npm.cmd run build --workspace @spark/admin
npx.cmd firebase-tools login
npx.cmd firebase-tools deploy --only hosting,firestore:rules,firestore:indexes
```

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

## 8. Turn on features

In the admin dashboard:

1. Enable support.
2. Test a conversation.
3. Create the Play product and run an internal test purchase.
4. Confirm the entitlement.
5. Enable purchases last.

Cloud config is enforced by the API, not only the UI. Allow up to 30 seconds for the config cache
on another scaled instance to observe an emergency change.

Keep `enable_synthetic_monitoring = false` while the service is unused. Set it to `true` and
provide `alert_email` only when public support or purchases justify a five-minute readiness probe
that wakes the scale-to-zero service.

## Why the Cloud Run service is public

Mobile devices and the static dashboard must reach its HTTPS URL. “Public” at the Cloud Run IAM
edge means requests can arrive; all non-config routes still require a valid Firebase token, and
admin routes require a role. This avoids embedding a server credential in the app.
