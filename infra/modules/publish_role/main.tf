terraform {
  required_version = "~> 1.16"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0"
    }
  }
}

resource "aws_iam_role" "publish" {
  name = "${var.name}-publish"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { AWS = "arn:aws:iam::${var.account_id}:root" }
    }]
  })
}

resource "aws_iam_role_policy" "publish" {
  name = "publish"
  role = aws_iam_role.publish.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["s3:ListBucket"], Resource = var.site_bucket_arn },
      { Effect = "Allow", Action = ["s3:PutObject", "s3:DeleteObject"], Resource = "${var.site_bucket_arn}/*" },
      { Effect = "Allow", Action = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"], Resource = var.distribution_arn },
      { Effect = "Allow", Action = ["s3:ListBucket"], Resource = "arn:aws:s3:::${var.state_bucket}" },
      { Effect = "Allow", Action = ["s3:GetObject"], Resource = ["arn:aws:s3:::${var.state_bucket}/app/terraform.tfstate", "arn:aws:s3:::${var.state_bucket}/env:/*/app/terraform.tfstate"] },
    ]
  })
}
