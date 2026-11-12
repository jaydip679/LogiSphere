# ==============================================================================
# LogiSphere — Root Outputs Definition
# ==============================================================================

# ------------------------------------------------------------------------------
# Networking Outputs
# ------------------------------------------------------------------------------
output "vpc_id" {
  description = "The ID of the provisioned LogiSphere VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs used for external ALB Ingress"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs hosting EKS worker nodes and microservices"
  value       = module.vpc.private_subnet_ids
}

output "nat_public_ip" {
  description = "The public Elastic IP address of the cost-conscious single NAT Gateway"
  value       = module.vpc.nat_public_ip
}

# ------------------------------------------------------------------------------
# Amazon EKS Outputs
# ------------------------------------------------------------------------------
output "cluster_name" {
  description = "The name of the Amazon EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "The Kubernetes API server endpoint URL"
  value       = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "oidc_provider_arn" {
  description = "The ARN of the OIDC Provider for Kubernetes IRSA authentication"
  value       = module.eks.oidc_provider_arn
}

output "configure_kubectl_command" {
  description = "Command to authenticate your local kubectl with the newly created EKS cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

# ------------------------------------------------------------------------------
# Amazon ECR Repository URLs
# ------------------------------------------------------------------------------
output "ecr_repository_urls" {
  description = "Map of all 6 LogiSphere microservices to their ECR repository URLs"
  value       = module.ecr.repository_urls
}

# ------------------------------------------------------------------------------
# IAM IRSA Role ARNs
# ------------------------------------------------------------------------------
output "aws_load_balancer_controller_role_arn" {
  description = "IAM Role ARN to annotate the AWS Load Balancer Controller ServiceAccount"
  value       = module.irsa.aws_load_balancer_controller_role_arn
}

output "microservices_sqs_role_arn" {
  description = "IAM Role ARN to annotate LogiSphere microservice ServiceAccounts for SQS access"
  value       = module.irsa.microservices_sqs_role_arn
}
