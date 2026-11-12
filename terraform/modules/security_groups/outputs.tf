# ==============================================================================
# LogiSphere — Security Groups Module Outputs
# ==============================================================================

output "cluster_security_group_id" {
  description = "Security group ID for the EKS control plane"
  value       = aws_security_group.cluster.id
}

output "node_security_group_id" {
  description = "Security group ID for the EKS worker nodes"
  value       = aws_security_group.nodes.id
}

output "alb_security_group_id" {
  description = "Security group ID for the external Application Load Balancer"
  value       = aws_security_group.alb.id
}
