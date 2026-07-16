variable "project_id" {
  description = "Existing Firebase/Google Cloud project ID."
  type        = string
}

variable "region" {
  description = "Cloud Run and Artifact Registry region."
  type        = string
  default     = "europe-central2"
}

variable "firestore_location" {
  description = "Immutable Firestore location. Warsaw is close to the initial operator."
  type        = string
  default     = "europe-central2"
}

variable "container_image" {
  description = "Published control-plane image. Leave blank until the first Cloud Build."
  type        = string
  default     = ""
}

variable "enable_cloud_runtime" {
  description = "Master switch for cost-bearing Spark cloud resources. Keep false for an offline-only release."
  type        = bool
  default     = false
}

variable "enable_google_play_rtdn" {
  description = "Create Google Play real-time developer notification resources. Requires the cloud runtime and a deployed image."
  type        = bool
  default     = false
}

variable "enable_maintenance_job" {
  description = "Create the nightly bounded-retention cleanup job. Requires the cloud runtime and a deployed image."
  type        = bool
  default     = false
}

variable "admin_email_allowlist" {
  description = "Comma-separated bootstrap owners. Remove after durable custom claims exist."
  type        = string
  sensitive   = true
  default     = ""
}

variable "allowed_origins" {
  description = "Comma-separated Firebase Hosting/admin origins."
  type        = string
  default     = "http://localhost:5173"
}

variable "google_play_package_name" {
  type    = string
  default = "com.sparkhabits.app"
}

variable "internal_oidc_audience" {
  description = "Private audience shared by Cloud Run, Pub/Sub, and Cloud Scheduler OIDC tokens."
  type        = string
  default     = "spark-internal"
}

variable "support_retention_days" {
  description = "Days to retain support conversations after their last activity."
  type        = number
  default     = 90
}

variable "audit_retention_days" {
  description = "Days to retain administrator audit records."
  type        = number
  default     = 365
}

variable "enable_synthetic_monitoring" {
  description = "Enable five-minute readiness probes and 5xx alerts. Off by default to preserve scale-to-zero."
  type        = bool
  default     = false
}

variable "alert_email" {
  description = "Optional operator email for monitoring notifications."
  type        = string
  default     = ""
}

variable "billing_account_id" {
  description = "Optional billing account ID for a budget alert. Budgets are alerts, not hard caps."
  type        = string
  default     = ""
}

variable "monthly_budget_usd" {
  type    = number
  default = 5
}
