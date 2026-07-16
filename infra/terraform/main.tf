provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

data "google_project" "current" {
  project_id = var.project_id
}

locals {
  services = toset([
    "artifactregistry.googleapis.com",
    "billingbudgets.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudscheduler.googleapis.com",
    "firebase.googleapis.com",
    "firebasehosting.googleapis.com",
    "firebaserules.googleapis.com",
    "firestore.googleapis.com",
    "identitytoolkit.googleapis.com",
    "monitoring.googleapis.com",
    "pubsub.googleapis.com",
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

resource "google_service_account" "internal_invoker" {
  account_id   = "spark-internal-invoker"
  display_name = "Spark authenticated internal job invoker"
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
      env {
        name  = "INTERNAL_OIDC_AUDIENCE"
        value = var.internal_oidc_audience
      }
      env {
        name  = "INTERNAL_SERVICE_ACCOUNT"
        value = google_service_account.internal_invoker.email
      }
      env {
        name  = "SUPPORT_RETENTION_DAYS"
        value = tostring(var.support_retention_days)
      }
      env {
        name  = "AUDIT_RETENTION_DAYS"
        value = tostring(var.audit_retention_days)
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

resource "google_cloud_run_v2_service_iam_member" "internal_invoker" {
  count    = var.container_image == "" ? 0 : 1
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.control_plane[0].name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.internal_invoker.email}"
}

resource "google_pubsub_topic" "google_play_rtdn" {
  name                       = "spark-google-play-rtdn"
  message_retention_duration = "604800s"

  depends_on = [google_project_service.required]
}

resource "google_pubsub_topic_iam_member" "google_play_publisher" {
  project = var.project_id
  topic   = google_pubsub_topic.google_play_rtdn.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:google-play-developer-notifications@system.gserviceaccount.com"
}

resource "google_project_iam_member" "pubsub_token_creator" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"

  depends_on = [google_project_service.required]
}

resource "google_pubsub_subscription" "google_play_rtdn" {
  count = var.container_image == "" ? 0 : 1

  name  = "spark-google-play-rtdn-push"
  topic = google_pubsub_topic.google_play_rtdn.id

  ack_deadline_seconds       = 30
  message_retention_duration = "604800s"

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.control_plane[0].uri}/v1/internal/google-play/rtdn"

    oidc_token {
      service_account_email = google_service_account.internal_invoker.email
      audience              = var.internal_oidc_audience
    }
  }

  depends_on = [
    google_cloud_run_v2_service_iam_member.internal_invoker,
    google_project_iam_member.pubsub_token_creator,
    google_pubsub_topic_iam_member.google_play_publisher
  ]
}

resource "google_cloud_scheduler_job" "maintenance" {
  count = var.container_image == "" ? 0 : 1

  name             = "spark-nightly-maintenance"
  description      = "Purge expired support, audit, and event-deduplication records."
  schedule         = "17 3 * * *"
  time_zone        = "Etc/UTC"
  attempt_deadline = "180s"

  retry_config {
    retry_count          = 3
    min_backoff_duration = "10s"
    max_backoff_duration = "300s"
    max_retry_duration   = "900s"
  }

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.control_plane[0].uri}/v1/internal/maintenance"
    headers = {
      "Content-Type" = "application/json"
    }
    body = base64encode("{}")

    oidc_token {
      service_account_email = google_service_account.internal_invoker.email
      audience              = var.internal_oidc_audience
    }
  }

  depends_on = [google_cloud_run_v2_service_iam_member.internal_invoker]
}

resource "google_monitoring_notification_channel" "operator_email" {
  count = var.enable_synthetic_monitoring && var.alert_email != "" ? 1 : 0

  display_name = "Spark operator email"
  type         = "email"
  labels = {
    email_address = var.alert_email
  }
}

# Disabled by default because a five-minute uptime probe intentionally wakes a
# scale-to-zero service. Enable it when cloud support or purchases become public.
resource "google_monitoring_uptime_check_config" "control_plane" {
  count = var.container_image != "" && var.enable_synthetic_monitoring ? 1 : 0

  display_name = "Spark control plane readiness"
  timeout      = "10s"
  period       = "300s"
  checker_type = "STATIC_IP_CHECKERS"

  http_check {
    path           = "/readyz"
    port           = 443
    request_method = "GET"
    use_ssl        = true
    validate_ssl   = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = trimprefix(google_cloud_run_v2_service.control_plane[0].uri, "https://")
    }
  }
}

resource "google_monitoring_alert_policy" "control_plane_errors" {
  count = var.container_image != "" && var.enable_synthetic_monitoring ? 1 : 0

  display_name = "Spark control plane elevated 5xx errors"
  combiner     = "OR"
  enabled      = true
  notification_channels = var.alert_email == "" ? [] : [
    google_monitoring_notification_channel.operator_email[0].name
  ]

  conditions {
    display_name = "Five or more server errors in five minutes"

    condition_threshold {
      filter = join(" AND ", [
        "resource.type = \"cloud_run_revision\"",
        "resource.labels.service_name = \"spark-control-plane\"",
        "metric.type = \"run.googleapis.com/request_count\"",
        "metric.labels.response_code_class = \"5xx\""
      ])
      comparison      = "COMPARISON_GT"
      threshold_value = 4
      duration        = "0s"

      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_SUM"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }

      trigger {
        count = 1
      }
    }
  }

  alert_strategy {
    auto_close = "1800s"
  }
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
