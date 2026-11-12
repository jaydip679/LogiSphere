# ==============================================================================
# LogiSphere — Security Groups Module Variables
# ==============================================================================

variable "project_name" {
  description = "Project name prefix used for resource naming"
  type        = string
  default     = "logisphere"
}

variable "environment" {
  description = "Target deployment environment (e.g. production)"
  type        = string
  default     = "production"
}

variable "vpc_id" {
  description = "The ID of the VPC where security groups will be provisioned"
  type        = string
}

variable "tags" {
  description = "Common tags to attach to security groups"
  type        = map(string)
  default     = {}
}
