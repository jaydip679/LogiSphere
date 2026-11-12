# ==============================================================================
# LogiSphere — IAM Module Outputs
# ==============================================================================

output "cluster_role_arn" {
  description = "The ARN of the EKS Cluster Control Plane IAM Role"
  value       = aws_iam_role.cluster.arn
}

output "cluster_iam_policy_attachment_ids" {
  description = "List of policy attachment IDs to enforce explicit creation dependency"
  value = [
    aws_iam_role_policy_attachment.cluster_AmazonEKSClusterPolicy.id,
    aws_iam_role_policy_attachment.cluster_AmazonEKSVPCResourceController.id
  ]
}

output "node_role_arn" {
  description = "The ARN of the EKS Worker Node Group IAM Role"
  value       = aws_iam_role.nodes.arn
}

output "node_iam_policy_attachment_ids" {
  description = "List of node policy attachment IDs to enforce explicit creation dependency"
  value = [
    aws_iam_role_policy_attachment.nodes_AmazonEKSWorkerNodePolicy.id,
    aws_iam_role_policy_attachment.nodes_AmazonEKS_CNI_Policy.id,
    aws_iam_role_policy_attachment.nodes_AmazonEC2ContainerRegistryReadOnly.id,
    aws_iam_role_policy_attachment.nodes_AmazonSSMManagedInstanceCore.id
  ]
}
