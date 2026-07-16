provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

locals {
  services = toset([
    "artifactregistry.googleapis.com",
    "billingbudgets.googleapis.com",
    "cloudbuild.googleapis.com",
    "firebase.googleapis.com",
    "firebasehosting.googleapis.com",
    "firebaserules.googleapis.com",
    "firestore.googleapis.com",
    "identitytoolkit.googleapis.com",
    "run.googleapis.com"
  ])
}

resource "google_firebase_project" "spark" {
  provider = google-beta
  project  = var.project_id

  depends_on = [google_project_service.required]
}

resource "google_project_service" "required" {
  for_each           = local.services
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "spark" {
  location      = var.region
  repository_id = "spark"
  description   = "Spark control-plane containers"
  format        = "DOCKER"

  cleanup_policies {
    id     = "delete-old-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "1209600s"
    }
  }

  depends_on = [google_project_service.required]
}

resource "google_firestore_database" "spark" {
  provider                    = google-beta
  project                     = var.project_id
  name                        = "(default)"
  location_id                 = var.firestore_location
  type                        = "FIRESTORE_NATIVE"
  concurrency_mode            = "PESSIMISTIC"
  app_engine_integration_mode = "DISABLED"
  deletion_policy             = "ABANDON"

  depends_on = [google_firebase_project.spark]
}

resource "google_service_account" "control_plane" {
  account_id   = "spark-control-plane"
  display_name = "Spark Cloud Run control plane"
}

resource "google_project_iam_member" "datastore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.control_plane.email}"
}

resource "google_project_iam_member" "firebase_auth_admin" {
  project = var.project_id
  role    = "roles/firebaseauth.admin"
  member  = "serviceAccount:${google_service_account.control_plane.email}"
}

resource "google_cloud_run_v2_service" "control_plane" {
  count    = var.container_image == "" ? 0 : 1
  name     = "spark-control-plane"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account                  = google_service_account.control_plane.email
    timeout                          = "30s"
    max_instance_request_concurrency = 40

    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }

    containers {
      image = var.container_image
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = false
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GOOGLE_CLOUD_REGION"
        value = var.region
      }
      env {
        name  = "GOOGLE_PLAY_PACKAGE_NAME"
        value = var.google_play_package_name
      }
      env {
        name  = "SPARK_PREMIUM_PRODUCT_ID"
        value = "spark_premium_lifetime"
      }
      env {
        name  = "ADMIN_EMAIL_ALLOWLIST"
        value = var.admin_email_allowlist
      }
      env {
        name  = "ALLOWED_ORIGINS"
        value = var.allowed_origins
      }
    }
  }

  depends_on = [
    google_project_service.required,
    google_project_iam_member.datastore_user,
    google_project_iam_member.firebase_auth_admin
  ]
}

resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count    = var.container_image == "" ? 0 : 1
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.control_plane[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_billing_budget" "spark" {
  count           = var.billing_account_id == "" ? 0 : 1
  billing_account = var.billing_account_id
  display_name    = "Spark monthly alert"

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(var.monthly_budget_usd)
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }
  threshold_rules {
    threshold_percent = 0.9
  }
  threshold_rules {
    threshold_percent = 1.0
  }
}
