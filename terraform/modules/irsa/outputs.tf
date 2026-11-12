# ==============================================================================
# LogiSphere — IRSA Module Outputs
# ==============================================================================

output "aws_load_balancer_controller_role_arn" {
  description = "The ARN of the IAM role for AWS Load Balancer Controller IRSA"
  value       = aws_iam_role.aws_load_balancer_controller.arn
}

output "microservices_sqs_role_arn" {
  description = "The ARN of the IAM role for LogiSphere Microservices SQS IRSA"
  value       = aws_iam_role.microservices_sqs.arn
}
