resource "aws_cloudwatch_log_group" "feedback" {
  name              = "/aws/lambda/${var.name}-lab-feedback"
  retention_in_days = 3
}

locals {
  feedback_policy = {
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "Logs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = ["${aws_cloudwatch_log_group.feedback.arn}:*"]
      },
      {
        Sid       = "Counter"
        Effect    = "Allow"
        Action    = ["dynamodb:UpdateItem"]
        Resource  = [aws_dynamodb_table.lab.arn]
        Condition = { "ForAllValues:StringLike" = { "dynamodb:LeadingKeys" = ["feedback#*"] } }
      },
      {
        Sid       = "Marks"
        Effect    = "Allow"
        Action    = ["dynamodb:PutItem"]
        Resource  = [aws_dynamodb_table.lab.arn]
        Condition = { "ForAllValues:StringLike" = { "dynamodb:LeadingKeys" = ["mark#*"] } }
      },
    ]
  }
}

resource "aws_iam_role" "feedback" {
  name               = "${var.name}-lab-feedback"
  assume_role_policy = jsonencode(local.lambda_assume_policy)
}

resource "aws_iam_role_policy" "feedback" {
  name   = "feedback"
  role   = aws_iam_role.feedback.id
  policy = jsonencode(local.feedback_policy)
}

resource "aws_lambda_function" "feedback" {
  function_name    = "${var.name}-lab-feedback"
  role             = aws_iam_role.feedback.arn
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  handler          = "index.handler"
  filename         = "${var.package_dir}/feedback.zip"
  source_code_hash = filebase64sha256("${var.package_dir}/feedback.zip")
  memory_size      = 256
  timeout          = 5

  environment {
    variables = {
      TABLE_NAME         = aws_dynamodb_table.lab.name
      FEEDBACK_DAILY_CAP = "500"
    }
  }

  depends_on = [aws_cloudwatch_log_group.feedback, aws_iam_role_policy.feedback]
}

resource "aws_lambda_function_url" "feedback" {
  function_name      = aws_lambda_function.feedback.function_name
  authorization_type = "AWS_IAM"
}
