# ==============================================================================
# LogiSphere — VPC Module Variables
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

variable "vpc_cidr" {
  description = "Base CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of Availability Zones in the target AWS region"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (used by ALB and NAT Gateway)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (used by EKS worker nodes and Pods)"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

variable "cluster_name" {
  description = "Name of the EKS cluster (used for Kubernetes discovery tags)"
  type        = string
  default     = "logisphere-eks-cluster"
}

variable "enable_nat_gateway" {
  description = "Whether to provision a NAT Gateway for private subnet outbound internet access"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Deploy a single shared NAT Gateway across all private subnets to optimize on-demand AWS costs"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Common tags to attach to all resources"
  type        = map(string)
  default     = {}
}
