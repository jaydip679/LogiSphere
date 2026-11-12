# ==============================================================================
# LogiSphere — Terraform & Provider Version Constraints
# Target: Production AWS Deployment (ap-south-1 Mumbai)
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Note: A local state file is used by default for safe on-demand development.
  # Remote S3 backend with DynamoDB state locking can be enabled when needed.
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "LogiSphere"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "Demonstration"
    }
  }
}
