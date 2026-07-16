output "artifact_repository" {
  value = var.enable_cloud_runtime ? google_artifact_registry_repository.spark[0].name : null
}

output "control_plane_url" {
  value = local.cloud_service_enabled ? google_cloud_run_v2_service.control_plane[0].uri : null
}

output "control_plane_service_account" {
  value = google_service_account.control_plane.email
}

output "internal_invoker_service_account" {
  value = google_service_account.internal_invoker.email
}

output "google_play_rtdn_topic" {
  description = "Paste this topic into Play Console > Monetize setup > Real-time developer notifications."
  value       = local.rtdn_enabled ? google_pubsub_topic.google_play_rtdn[0].id : null
}

output "google_play_rtdn_subscription" {
  value = local.rtdn_enabled ? google_pubsub_subscription.google_play_rtdn[0].name : null
}
