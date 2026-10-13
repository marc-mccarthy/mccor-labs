data "aws_caller_identity" "current" {}

resource "aws_cloudwatch_log_group" "lab" {
  name              = "/aws/lambda/${var.name}-lab"
  retention_in_days = 3
}

resource "aws_ssm_parameter" "lab_enabled" {
  name  = "/mccorlabs/labs/should-this-be-ai/enabled"
  type  = "String"
  value = "false"

  lifecycle {
    ignore_changes = [value]
  }
}

locals {
  lab_profile_arn = "arn:aws:bedrock:us-east-1:${data.aws_caller_identity.current.account_id}:inference-profile/${var.lab_model_id}"
  lab_model_arns  = [for r in var.lab_profile_regions : "arn:aws:bedrock:${r}::foundation-model/${var.lab_foundation_model_id}"]

  lab_policy = {
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "InvokeProfile"
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel"]
        Resource = [local.lab_profile_arn]
      },
      {
        Sid       = "InvokeModelViaProfile"
        Effect    = "Allow"
        Action    = ["bedrock:InvokeModel"]
        Resource  = local.lab_model_arns
        Condition = { StringEquals = { "bedrock:InferenceProfileArn" = local.lab_profile_arn } }
      },
      {
        Sid      = "Guardrail"
        Effect   = "Allow"
        Action   = ["bedrock:ApplyGuardrail"]
        Resource = [aws_bedrock_guardrail.lab.guardrail_arn]
      },
      {
        Sid       = "Counter"
        Effect    = "Allow"
        Action    = ["dynamodb:UpdateItem"]
        Resource  = [aws_dynamodb_table.lab.arn]
        Condition = { "ForAllValues:StringLike" = { "dynamodb:LeadingKeys" = ["lab-race#*", "lab-argue#*"] } }
      },
      {
        Sid      = "KillFlag"
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = [aws_ssm_parameter.lab_enabled.arn]
      },
      {
        Sid      = "Logs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = ["${aws_cloudwatch_log_group.lab.arn}:*"]
      },
    ]
  }
}

resource "aws_iam_role" "lab" {
  name               = "${var.name}-lab"
  assume_role_policy = jsonencode(local.lambda_assume_policy)
}

resource "aws_iam_role_policy" "lab" {
  name   = "lab"
  role   = aws_iam_role.lab.id
  policy = jsonencode(local.lab_policy)
}
