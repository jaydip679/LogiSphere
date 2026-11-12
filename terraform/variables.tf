# ==============================================================================
# LogiSphere — Root Variables Definition
# Target: Production AWS Deployment (ap-south-1 Mumbai)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Project & Environment Metadata
# ------------------------------------------------------------------------------
variable "project_name" {
  description = "Project name prefix used for all AWS resource naming conventions"
  type        = string
  default     = "logisphere"
}

variable "environment" {
  description = "Target deployment environment tag (e.g. production, staging)"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "Target AWS region for infrastructure deployment"
  type        = string
  default     = "ap-south-1"
}

# ------------------------------------------------------------------------------
# 2. VPC & Networking Configuration
# ------------------------------------------------------------------------------
variable "vpc_cidr" {
  description = "Base CIDR block for the LogiSphere VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "AWS Availability Zones in Mumbai (ap-south-1) for high availability"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (used by ALB Ingress and NAT Gateway)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (used by EKS worker nodes and microservice pods)"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

variable "enable_nat_gateway" {
  description = "Whether to provision a NAT Gateway for outbound internet egress from private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Deploy a single shared NAT Gateway across all private subnets to cut AWS hourly charges by 50%"
  type        = bool
  default     = true
}

# ------------------------------------------------------------------------------
# 3. Amazon EKS Cluster Configuration
# ------------------------------------------------------------------------------
variable "cluster_name" {
  description = "Name of the managed Amazon EKS cluster"
  type        = string
  default     = "logisphere-eks-cluster"
}

variable "kubernetes_version" {
  description = "Desired Kubernetes control plane version in EKS standard support (v1.36)"
  type        = string
  default     = "1.36"
}

variable "cluster_endpoint_public_access" {
  description = "Enable public API server endpoint access (for kubectl access from workstation)"
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "List of CIDR blocks permitted to access the public EKS API endpoint (restrict to workstation IP for maximum security)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "cluster_endpoint_private_access" {
  description = "Enable private API server endpoint access inside the VPC"
  type        = bool
  default     = true
}

# ------------------------------------------------------------------------------
# 4. EKS Managed Worker Node Group Configuration
# ------------------------------------------------------------------------------
variable "node_instance_types" {
  description = "EC2 instance types for EKS worker nodes (t3.small: 1 vCPU / 2GB RAM; t3.medium: 2 vCPU / 4GB RAM)"
  type        = list(string)
  default     = ["t3.small"]
}

variable "node_capacity_type" {
  description = "Capacity type for worker nodes: SPOT (~70% discount for demo sessions) or ON_DEMAND"
  type        = string
  default     = "SPOT"

  validation {
    condition     = contains(["SPOT", "ON_DEMAND"], var.node_capacity_type)
    error_message = "node_capacity_type must be either 'SPOT' or 'ON_DEMAND'."
  }
}

variable "node_scaling_config" {
  description = "Autoscaling configuration for the EKS managed node group"
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
  description = "Root EBS storage volume size in GB per worker node (gp3)"
  type        = number
  default     = 20
}

# ------------------------------------------------------------------------------
# 5. Amazon ECR & Workload Microservice Settings
# ------------------------------------------------------------------------------
variable "ecr_service_names" {
  description = "List of LogiSphere microservices requiring dedicated ECR container registries"
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

variable "sqs_queue_prefix" {
  description = "Prefix for AWS SQS queues that EKS microservices are permitted to access via IRSA (strictly isolated to logisphere-eks-*)"
  type        = string
  default     = "logisphere-eks-"
}

# ------------------------------------------------------------------------------
# 6. Global Resource Tags
# ------------------------------------------------------------------------------
variable "tags" {
  description = "Additional metadata tags to append to all provisioned AWS resources"
  type        = map(string)
  default     = {}
}
