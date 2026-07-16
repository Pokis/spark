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

variable "billing_account_id" {
  description = "Optional billing account ID for a budget alert. Budgets are alerts, not hard caps."
  type        = string
  default     = ""
}

variable "monthly_budget_usd" {
  type    = number
  default = 5
}
