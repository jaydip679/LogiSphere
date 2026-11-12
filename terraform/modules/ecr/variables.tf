# ==============================================================================
# LogiSphere — Amazon ECR Module Variables
# ==============================================================================

variable "project_name" {
  description = "Project name prefix used for ECR repository naming"
  type        = string
  default     = "logisphere"
}

variable "service_names" {
  description = "List of microservice names to create private ECR repositories for"
  type        = list(string)
  default = [
    "api-gateway",
    "auth-service",
    "shipment-service",
    "fleet-dispatch-service",
    "tracking-service",
    "notification-service"
  ]
}

variable "image_tag_mutability" {
  description = "The tag mutability setting for the repository (MUTABLE or IMMUTABLE)"
  type        = string
  default     = "MUTABLE"
}

variable "scan_on_push" {
  description = "Indicates whether images are scanned after being pushed to the repository"
  type        = bool
  default     = true
}

variable "max_untagged_image_age_days" {
  description = "Number of days after which untagged images are automatically deleted by lifecycle policy"
  type        = number
  default     = 7
}

variable "max_tagged_image_count" {
  description = "Maximum number of tagged images to retain per repository to keep storage costs negligible"
  type        = number
  default     = 10
}

variable "tags" {
  description = "Common tags to attach to ECR repositories"
  type        = map(string)
  default     = {}
}
