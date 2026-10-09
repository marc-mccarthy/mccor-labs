data "aws_region" "current" {}

resource "aws_cloudwatch_log_group" "digest" {
  name              = "/aws/lambda/${var.name}-lab-digest"
  retention_in_days = 3
}

locals {
  digest_policy = {
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "Logs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = ["${aws_cloudwatch_log_group.digest.arn}:*"]
      },
      {
        Sid      = "ScanMarks"
        Effect   = "Allow"
        Action   = ["dynamodb:Scan"]
        Resource = [aws_dynamodb_table.lab.arn]
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

  digest_scheduler_assume_policy = {
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "scheduler.amazonaws.com" }
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          "aws:SourceArn"     = "arn:aws:scheduler:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:schedule-group/default"
        }
      }
    }]
  }

  digest_scheduler_policy = {
    Version = "2012-10-17"
    Statement = [{
      Sid      = "InvokeDigest"
      Effect   = "Allow"
      Action   = ["lambda:InvokeFunction"]
      Resource = [aws_lambda_function.digest.arn]
    }]
  }
}

resource "aws_iam_role" "digest" {
  name               = "${var.name}-lab-digest"
  assume_role_policy = jsonencode(local.lambda_assume_policy)
}

resource "aws_iam_role_policy" "digest" {
  name   = "digest"
  role   = aws_iam_role.digest.id
  policy = jsonencode(local.digest_policy)
}

resource "aws_lambda_function" "digest" {
  function_name    = "${var.name}-lab-digest"
  role             = aws_iam_role.digest.arn
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  handler          = "index.handler"
  filename         = "${var.package_dir}/digest.zip"
  source_code_hash = filebase64sha256("${var.package_dir}/digest.zip")
  memory_size      = 256
  timeout          = 30

  environment {
    variables = {
      TABLE_NAME  = aws_dynamodb_table.lab.name
      DIGEST_FROM = var.contact_from
      DIGEST_TO   = var.contact_to
    }
  }

  depends_on = [aws_cloudwatch_log_group.digest, aws_iam_role_policy.digest]
}

resource "aws_lambda_function_event_invoke_config" "digest" {
  function_name          = aws_lambda_function.digest.function_name
  maximum_retry_attempts = 0
}

resource "aws_iam_role" "digest_scheduler" {
  name               = "${var.name}-lab-digest-scheduler"
  assume_role_policy = jsonencode(local.digest_scheduler_assume_policy)
}

resource "aws_iam_role_policy" "digest_scheduler" {
  name   = "digest-scheduler"
  role   = aws_iam_role.digest_scheduler.id
  policy = jsonencode(local.digest_scheduler_policy)
}

resource "aws_scheduler_schedule" "digest" {
  name                         = "${var.name}-lab-digest"
  group_name                   = "default"
  schedule_expression          = "cron(0 8 ? * MON *)"
  schedule_expression_timezone = "America/Chicago"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.digest.arn
    role_arn = aws_iam_role.digest_scheduler.arn

    retry_policy {
      maximum_retry_attempts       = 2
      maximum_event_age_in_seconds = 3600
    }
  }

  depends_on = [aws_iam_role_policy.digest_scheduler]
}
