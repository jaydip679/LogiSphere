# ==============================================================================
# LogiSphere — Root Terraform Infrastructure Orchestrator
# Target: Production AWS Deployment (ap-south-1 Mumbai)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Virtual Private Cloud (VPC) & Networking
# ------------------------------------------------------------------------------
module "vpc" {
  source = "./modules/vpc"

  project_name         = var.project_name
  environment          = var.environment
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  cluster_name         = var.cluster_name
  enable_nat_gateway   = var.enable_nat_gateway
  single_nat_gateway   = var.single_nat_gateway
  tags                 = var.tags
}

# ------------------------------------------------------------------------------
# 2. Security Groups & Firewall Isolation
# ------------------------------------------------------------------------------
module "security_groups" {
  source = "./modules/security_groups"

  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
  tags         = var.tags
}

# ------------------------------------------------------------------------------
# 3. Amazon Elastic Container Registry (ECR) Repositories
# ------------------------------------------------------------------------------
module "ecr" {
  source = "./modules/ecr"

  project_name  = var.project_name
  service_names = var.ecr_service_names
  tags          = var.tags
}

# ------------------------------------------------------------------------------
# 4. Base IAM Roles for EKS Control Plane & Worker Node Groups
# ------------------------------------------------------------------------------
module "iam" {
  source = "./modules/iam"

  project_name = var.project_name
  environment  = var.environment
  tags         = var.tags
}

# ------------------------------------------------------------------------------
# 5. Amazon Elastic Kubernetes Service (EKS) Cluster & Managed Node Group
# ------------------------------------------------------------------------------
module "eks" {
  source = "./modules/eks"

  project_name              = var.project_name
  environment               = var.environment
  cluster_name              = var.cluster_name
  kubernetes_version        = var.kubernetes_version
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = concat(module.vpc.public_subnet_ids, module.vpc.private_subnet_ids)
  node_subnet_ids           = module.vpc.private_subnet_ids
  cluster_security_group_id = module.security_groups.cluster_security_group_id
  node_security_group_id    = module.security_groups.node_security_group_id
  cluster_role_arn          = module.iam.cluster_role_arn
  node_role_arn             = module.iam.node_role_arn
  endpoint_public_access    = var.cluster_endpoint_public_access
  endpoint_private_access   = var.cluster_endpoint_private_access
  node_instance_types       = var.node_instance_types
  node_capacity_type        = var.node_capacity_type
  node_scaling_config       = var.node_scaling_config
  node_disk_size_gb         = var.node_disk_size_gb
  tags                      = var.tags
}

# ------------------------------------------------------------------------------
# 6. IAM Roles for Service Accounts (IRSA) via EKS OIDC Federation
# ------------------------------------------------------------------------------
module "irsa" {
  source = "./modules/irsa"

  project_name      = var.project_name
  environment       = var.environment
  aws_region        = var.aws_region
  oidc_issuer_url   = module.eks.oidc_issuer_url
  oidc_provider_arn = module.eks.oidc_provider_arn
  sqs_queue_prefix  = var.sqs_queue_prefix
  tags              = var.tags
}
