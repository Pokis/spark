output "artifact_repository" {
  value = google_artifact_registry_repository.spark.name
}

output "control_plane_url" {
  value = var.container_image == "" ? null : google_cloud_run_v2_service.control_plane[0].uri
}

output "control_plane_service_account" {
  value = google_service_account.control_plane.email
}
