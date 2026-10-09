terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0"
    }
  }
}

resource "aws_dynamodb_table" "lab" {
  name         = "${var.name}-lab"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
}

resource "aws_cloudwatch_log_group" "contact" {
  name              = "/aws/lambda/${var.name}-contact"
  retention_in_days = 3
}

locals {
  lambda_assume_policy = {
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  }

  contact_policy = {
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "Logs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = ["${aws_cloudwatch_log_group.contact.arn}:*"]
      },
      {
        Sid       = "Counter"
        Effect    = "Allow"
        Action    = ["dynamodb:UpdateItem"]
        Resource  = [aws_dynamodb_table.lab.arn]
        Condition = { "ForAllValues:StringLike" = { "dynamodb:LeadingKeys" = ["contact#*"] } }
      },
      {
        Sid       = "Mail"
        Effect    = "Allow"
        Action    = ["ses:SendEmail"]
        Resource  = [var.ses_identity_arn]
        Condition = { StringEquals = { "ses:FromAddress" = var.contact_from } }
      },
    ]
  }
}

resource "aws_iam_role" "contact" {
  name               = "${var.name}-contact"
  assume_role_policy = jsonencode(local.lambda_assume_policy)
}

resource "aws_iam_role_policy" "contact" {
  name   = "contact"
  role   = aws_iam_role.contact.id
  policy = jsonencode(local.contact_policy)
}
