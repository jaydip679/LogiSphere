# ==============================================================================
# LogiSphere — Amazon ECR Repositories & Automated Lifecycle Management
# ==============================================================================

resource "aws_ecr_repository" "services" {
  for_each             = toset(var.service_names)
  name                 = "${var.project_name}/${each.value}"
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}/${each.value}"
      Service = each.value
    }
  )
}

# ------------------------------------------------------------------------------
# Automated Cost-Conscious Lifecycle Policy
# Automatically purges stale/untagged layers after 7 days and limits tagged releases
# to prevent unbounded storage charges on Amazon ECR.
# ------------------------------------------------------------------------------
resource "aws_ecr_lifecycle_policy" "cleanup" {
  for_each   = toset(var.service_names)
  repository = aws_ecr_repository.services[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than ${var.max_untagged_image_age_days} days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = var.max_untagged_image_age_days
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Retain at most ${var.max_tagged_image_count} tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "sha", "release", "build"]
          countType     = "imageCountMoreThan"
          countNumber   = var.max_tagged_image_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
