# ==============================================================================
# LogiSphere — Amazon ECR Module Outputs
# ==============================================================================

output "repository_urls" {
  description = "Map of microservice names to their full ECR repository URLs (for docker tag & push)"
  value       = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

output "repository_arns" {
  description = "Map of microservice names to their ECR repository ARNs"
  value       = { for k, v in aws_ecr_repository.services : k => v.arn }
}

output "registry_id" {
  description = "The AWS Account ID hosting the ECR registries"
  value       = length(var.service_names) > 0 ? aws_ecr_repository.services[var.service_names[0]].registry_id : ""
}
