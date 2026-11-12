# ==============================================================================
# LogiSphere — IRSA (IAM Roles for Service Accounts) Module Variables
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

variable "aws_region" {
  description = "Target AWS region for resource ARN constraints"
  type        = string
  default     = "ap-south-1"
}

variable "oidc_issuer_url" {
  description = "The OIDC issuer URL of the EKS cluster (without leading https://)"
  type        = string
}

variable "oidc_provider_arn" {
  description = "The ARN of the OIDC provider created for the EKS cluster"
  type        = string
}

variable "sqs_queue_prefix" {
  description = "Prefix for SQS queues that microservices are permitted to access via IRSA (strictly logisphere-eks-*)"
  type        = string
  default     = "logisphere-eks-"
}

variable "tags" {
  description = "Common tags to attach to IRSA resources"
  type        = map(string)
  default     = {}
}
