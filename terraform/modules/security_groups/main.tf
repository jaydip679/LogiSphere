# ==============================================================================
# LogiSphere — Security Groups & Network Firewall Rules
# Enforces Least-Privilege Isolation for Control Plane, Worker Nodes & ALB
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. EKS Control Plane Security Group
# ------------------------------------------------------------------------------
resource "aws_security_group" "cluster" {
  name        = "${var.project_name}-${var.environment}-eks-cluster-sg"
  description = "Security group for the EKS control plane communication with worker nodes"
  vpc_id      = var.vpc_id

  egress {
    description = "Allow control plane outbound traffic to worker nodes"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-eks-cluster-sg"
    }
  )
}

# ------------------------------------------------------------------------------
# 2. Application Load Balancer (ALB) Security Group
# ------------------------------------------------------------------------------
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "Security group for external public ingress Application Load Balancer"
  vpc_id      = var.vpc_id

  ingress {
    description = "Allow inbound HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow inbound HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow outbound to worker nodes target groups"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-alb-sg"
    }
  )
}

# ------------------------------------------------------------------------------
# 3. EKS Managed Worker Node Group Security Group
# ------------------------------------------------------------------------------
resource "aws_security_group" "nodes" {
  name        = "${var.project_name}-${var.environment}-eks-node-sg"
  description = "Security group for all worker nodes hosting LogiSphere microservice pods"
  vpc_id      = var.vpc_id

  egress {
    description = "Allow all outbound traffic (NAT Gateway, Neon PostgreSQL 5432, SQS 443, ECR)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-${var.environment}-eks-node-sg"
    }
  )
}

# ------------------------------------------------------------------------------
# 4. Inter-Resource Security Group Rules
# ------------------------------------------------------------------------------

# Allow pods and nodes to communicate freely with each other (Pod network CNI & CoreDNS)
resource "aws_security_group_rule" "nodes_internal" {
  description              = "Allow node-to-node communication across all ports for overlay pod networking"
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "-1"
  security_group_id        = aws_security_group.nodes.id
  source_security_group_id = aws_security_group.nodes.id
}

# Allow worker kubelets to receive API commands from the EKS control plane (exec, logs, port-forward)
resource "aws_security_group_rule" "nodes_from_cluster_api" {
  description              = "Allow worker kubelets to receive communication from EKS control plane"
  type                     = "ingress"
  from_port                = 10250
  to_port                  = 10250
  protocol                 = "tcp"
  security_group_id        = aws_security_group.nodes.id
  source_security_group_id = aws_security_group.cluster.id
}

# Allow pods on worker nodes to query the Kubernetes API server
resource "aws_security_group_rule" "cluster_from_nodes" {
  description              = "Allow worker nodes and pods to communicate with EKS cluster API server"
  type                     = "ingress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  security_group_id        = aws_security_group.cluster.id
  source_security_group_id = aws_security_group.nodes.id
}

# ------------------------------------------------------------------------------
# Ingress: ALB to Worker Nodes
# Restricted strictly to Kubernetes NodePort service range (target-type instance)
# and API Gateway direct Pod ports (target-type ip)
# ------------------------------------------------------------------------------
resource "aws_security_group_rule" "nodes_from_alb_nodeports" {
  description              = "Allow ALB to route ingress traffic to Kubernetes NodePort services"
  type                     = "ingress"
  from_port                = 30000
  to_port                  = 32767
  protocol                 = "tcp"
  security_group_id        = aws_security_group.nodes.id
  source_security_group_id = aws_security_group.alb.id
}

resource "aws_security_group_rule" "nodes_from_alb_gateway_pod" {
  description              = "Allow ALB to route ingress traffic directly to API Gateway Pod (port 5000)"
  type                     = "ingress"
  from_port                = 5000
  to_port                  = 5000
  protocol                 = "tcp"
  security_group_id        = aws_security_group.nodes.id
  source_security_group_id = aws_security_group.alb.id
}

resource "aws_security_group_rule" "nodes_from_alb_gateway_pod_alt" {
  description              = "Allow ALB to route ingress traffic directly to API Gateway Pod (port 10000)"
  type                     = "ingress"
  from_port                = 10000
  to_port                  = 10000
  protocol                 = "tcp"
  security_group_id        = aws_security_group.nodes.id
  source_security_group_id = aws_security_group.alb.id
}
