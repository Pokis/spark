output "artifact_repository" {
  value = google_artifact_registry_repository.spark.name
}

output "control_plane_url" {
  value = var.container_image == "" ? null : google_cloud_run_v2_service.control_plane[0].uri
}

output "control_plane_service_account" {
  value = google_service_account.control_plane.email
}

output "internal_invoker_service_account" {
  value = google_service_account.internal_invoker.email
}

output "google_play_rtdn_topic" {
  description = "Paste this topic into Play Console > Monetize setup > Real-time developer notifications."
  value       = google_pubsub_topic.google_play_rtdn.id
}

output "google_play_rtdn_subscription" {
  value = var.container_image == "" ? null : google_pubsub_subscription.google_play_rtdn[0].name
}
