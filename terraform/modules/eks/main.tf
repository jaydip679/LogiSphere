# ==============================================================================
# LogiSphere — Amazon EKS Cluster & Managed Node Group Architecture
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Amazon EKS Control Plane
# ------------------------------------------------------------------------------
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = var.cluster_role_arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = var.subnet_ids
    security_group_ids      = [var.cluster_security_group_id]
    endpoint_private_access = var.endpoint_private_access
    endpoint_public_access  = var.endpoint_public_access
    public_access_cidrs     = var.public_access_cidrs
  }

  # Enable core control plane audit and diagnostic logging
  enabled_cluster_log_types = ["api", "audit", "authenticator"]

  tags = merge(
    var.tags,
    {
      Name = var.cluster_name
    }
  )
}

# ------------------------------------------------------------------------------
# 2. OpenID Connect (OIDC) Identity Provider
# Required for IAM Roles for Service Accounts (IRSA)
# ------------------------------------------------------------------------------
data "tls_certificate" "cluster" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "oidc" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.cluster.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = merge(
    var.tags,
    {
      Name = "${var.cluster_name}-oidc-provider"
    }
  )
}

# ------------------------------------------------------------------------------
# 3. Launch Template for Managed Node Group
# Attaches custom security group, configures encrypted gp3 EBS, and enforces IMDSv2
# ------------------------------------------------------------------------------
resource "aws_launch_template" "nodes" {
  name_prefix   = "${var.project_name}-${var.environment}-node-"
  description   = "Launch template for LogiSphere EKS managed worker nodes with custom security groups and IMDSv2"
  instance_type = var.node_instance_types[0]

  vpc_security_group_ids = [
    var.node_security_group_id,
    aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
  ]

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = var.node_disk_size_gb
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required" # Enforce IMDSv2
    http_put_response_hop_limit = 1          # Restrict IMDS access strictly to host OS, preventing container/pod SSRF credential theft. (IRSA uses projected OIDC tokens and STS directly, not IMDS)
  }

  tag_specifications {
    resource_type = "instance"
    tags = merge(
      var.tags,
      {
        Name = "${var.project_name}-${var.environment}-node"
      }
    )
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ------------------------------------------------------------------------------
# 4. Amazon EKS Managed Worker Node Group
# Deployed strictly in private subnets with Spot instances for cost control
# ------------------------------------------------------------------------------
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project_name}-${var.environment}-node-group"
  node_role_arn   = var.node_role_arn
  subnet_ids      = var.node_subnet_ids

  capacity_type = var.node_capacity_type

  launch_template {
    id      = aws_launch_template.nodes.id
    version = aws_launch_template.nodes.latest_version
  }

  scaling_config {
    desired_size = var.node_scaling_config.desired_size
    min_size     = var.node_scaling_config.min_size
    max_size     = var.node_scaling_config.max_size
  }

  update_config {
    max_unavailable = 1
  }

  labels = {
    Environment = var.environment
    NodeGroup   = "primary"
  }

  tags = merge(
    var.tags,
    {
      Name                                            = "${var.project_name}-${var.environment}-node"
      "k8s.io/cluster-autoscaler/${var.cluster_name}" = "owned"
      "k8s.io/cluster-autoscaler/enabled"             = "true"
    }
  )

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [scaling_config[0].desired_size]
  }
}

# ------------------------------------------------------------------------------
# 5. Essential Managed EKS Add-ons
# ------------------------------------------------------------------------------
resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "vpc-cni"
}

resource "aws_eks_addon" "coredns" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "coredns"

  depends_on = [aws_eks_node_group.main]
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "kube-proxy"
}
