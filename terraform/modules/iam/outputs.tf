# ==============================================================================
# LogiSphere — IAM Module Outputs
# ==============================================================================

output "cluster_role_arn" {
  description = "The ARN of the EKS Cluster Control Plane IAM Role"
  value       = aws_iam_role.cluster.arn
}

output "node_role_arn" {
  description = "The ARN of the EKS Worker Node Group IAM Role"
  value       = aws_iam_role.nodes.arn
}
