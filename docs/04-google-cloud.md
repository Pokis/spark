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

Firestore location is immutable. If most eventual users will be far from Europe, review the
choice before creating the database. Support latency is not critical, so a nearby regional
location is usually cheaper and simpler than multi-region.

## Credits

Firebase uses the same Google Cloud project and billing account. Eligible usage can generally
consume Google Cloud credits after no-cost quotas, but credit scope and expiration vary. Confirm
your credit terms in Cloud Billing; do not assume every marketplace or third-party charge is
covered.

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
binding, APIs, Firestore, repository, IAM, and optional budget without Cloud Run.

```powershell
Set-Location infra\terraform
terraform init
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

Terraform outputs the Cloud Run URL. Add it to `apps/admin/.env.local` and the root `.env`.

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

## 8. Turn on features

In the admin dashboard:

1. Enable support.
2. Test a conversation.
3. Create the Play product and run an internal test purchase.
4. Confirm the entitlement.
5. Enable purchases last.

Cloud config is a convenience switch, not an authorization boundary. The API still verifies all
tokens and roles.

## Why the Cloud Run service is public

Mobile devices and the static dashboard must reach its HTTPS URL. “Public” at the Cloud Run IAM
edge means requests can arrive; all non-config routes still require a valid Firebase token, and
admin routes require a role. This avoids embedding a server credential in the app.
