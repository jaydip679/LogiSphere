# ==============================================================================
# LogiSphere — Amazon EKS Module Variables
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

variable "cluster_name" {
  description = "Name of the managed EKS cluster"
  type        = string
  default     = "logisphere-eks-cluster"
}

variable "kubernetes_version" {
  description = "Kubernetes control plane version"
  type        = string
  default     = "1.30"
}

variable "vpc_id" {
  description = "VPC ID where the cluster is deployed"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for EKS control plane ENIs (both public and private subnets across 2 AZs)"
  type        = list(string)
}

variable "node_subnet_ids" {
  description = "Private subnet IDs where worker nodes will be launched"
  type        = list(string)
}

variable "cluster_security_group_id" {
  description = "Security group ID for the EKS control plane"
  type        = string
}

variable "node_security_group_id" {
  description = "Security group ID for the EKS worker nodes"
  type        = string
}

variable "cluster_role_arn" {
  description = "IAM Role ARN for the EKS control plane"
  type        = string
}

variable "node_role_arn" {
  description = "IAM Role ARN for the EKS managed node group"
  type        = string
}

variable "endpoint_public_access" {
  description = "Enable public access to the Kubernetes API server endpoint"
  type        = bool
  default     = true
}

variable "public_access_cidrs" {
  description = "List of CIDR blocks permitted to access the public EKS API endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "endpoint_private_access" {
  description = "Enable private access to the Kubernetes API server endpoint inside the VPC"
  type        = bool
  default     = true
}

variable "node_instance_types" {
  description = "EC2 instance types for the worker node group"
  type        = list(string)
  default     = ["t3.small"]
}

variable "node_capacity_type" {
  description = "Capacity type for worker nodes (SPOT or ON_DEMAND)"
  type        = string
  default     = "SPOT"
}

variable "node_scaling_config" {
  description = "Autoscaling configuration for worker nodes"
  type = object({
    desired_size = number
    min_size     = number
    max_size     = number
  })
  default = {
    desired_size = 2
    min_size     = 1
    max_size     = 3
  }
}

variable "node_disk_size_gb" {
  description = "Root disk size in GB for each worker node (gp3)"
  type        = number
  default     = 20
}

variable "tags" {
  description = "Common tags to attach to all EKS resources"
  type        = map(string)
  default     = {}
}
