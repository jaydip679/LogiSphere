# ==============================================================================
# LogiSphere — IAM Module Variables
# ==============================================================================

variable "project_name" {
  description = "Project name prefix used for IAM resource naming"
  type        = string
  default     = "logisphere"
}

variable "environment" {
  description = "Target deployment environment (e.g. production)"
  type        = string
  default     = "production"
}

variable "tags" {
  description = "Common tags to attach to IAM resources"
  type        = map(string)
  default     = {}
}
