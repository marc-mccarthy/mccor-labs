mock_provider "aws" {}

override_resource {
  target          = aws_cloudwatch_log_group.contact
  override_during = plan
  values          = { arn = "arn:aws:logs:us-east-1:111111111111:log-group:/aws/lambda/t-contact" }
}

override_resource {
  target          = aws_dynamodb_table.lab
  override_during = plan
  values          = { arn = "arn:aws:dynamodb:us-east-1:111111111111:table/t-lab" }
}

override_resource {
  target          = aws_lambda_function_url.contact
  override_during = plan
  values          = { function_url = "https://abc123.lambda-url.us-east-1.on.aws/" }
}

override_resource {
  target          = aws_lambda_function.contact
  override_during = plan
  values          = { arn = "arn:aws:lambda:us-east-1:111111111111:function:t-contact" }
}

override_data {
  target = data.aws_caller_identity.current
  values = { account_id = "111111111111" }
}

override_resource {
  target          = aws_bedrock_guardrail.lab
  override_during = plan
  values          = { guardrail_arn = "arn:aws:bedrock:us-east-1:111111111111:guardrail/abc123" }
}

override_resource {
  target          = aws_cloudwatch_log_group.lab
  override_during = plan
  values          = { arn = "arn:aws:logs:us-east-1:111111111111:log-group:/aws/lambda/t-lab" }
}

override_resource {
  target          = aws_ssm_parameter.lab_enabled
  override_during = plan
  values          = { arn = "arn:aws:ssm:us-east-1:111111111111:parameter/mccorlabs/labs/should-this-be-ai/enabled" }
}

override_resource {
  target          = aws_iam_role.lab
  override_during = plan
  values          = { arn = "arn:aws:iam::111111111111:role/t-lab" }
}

override_resource {
  target          = aws_iam_role.lab_brake
  override_during = plan
  values          = { arn = "arn:aws:iam::111111111111:role/t-lab-brake" }
}

override_resource {
  target          = aws_iam_policy.lab_brake_deny
  override_during = plan
  values          = { arn = "arn:aws:iam::111111111111:policy/t-lab-brake-deny" }
}

variables {
  name             = "t"
  package_dir      = "../../../app/api/dist"
  ses_identity_arn = "arn:aws:ses:us-east-1:111111111111:identity/example.com"
  contact_from     = "website@example.com"
  contact_to       = "owner@example.com"
  alert_email      = "alerts@example.com"
  alarm_topic_arn  = "arn:aws:sns:us-east-1:111111111111:t-alerts"
}

override_resource {
  target          = aws_cloudwatch_log_group.feedback
  override_during = plan
  values          = { arn = "arn:aws:logs:us-east-1:111111111111:log-group:/aws/lambda/t-lab-feedback" }
}

override_resource {
  target          = aws_lambda_function_url.feedback
  override_during = plan
  values          = { function_url = "https://fb123.lambda-url.us-east-1.on.aws/" }
}

override_resource {
  target          = aws_lambda_function.feedback
  override_during = plan
  values          = { arn = "arn:aws:lambda:us-east-1:111111111111:function:t-lab-feedback" }
}

run "feedback_function" {
  command = plan

  assert {
    condition     = aws_lambda_function.feedback.runtime == "nodejs24.x" && tolist(aws_lambda_function.feedback.architectures) == tolist(["arm64"]) && aws_lambda_function.feedback.handler == "index.handler"
    error_message = "feedback must be Node 24 on arm64"
  }

  assert {
    condition     = aws_lambda_function.feedback.environment[0].variables["FEEDBACK_DAILY_CAP"] == "500"
    error_message = "feedback cap must be 500 a day"
  }

  assert {
    condition     = aws_lambda_function.feedback.environment[0].variables["TABLE_NAME"] == "t-lab"
    error_message = "feedback must use the lab table"
  }

  assert {
    condition     = aws_lambda_function_url.feedback.authorization_type == "AWS_IAM"
    error_message = "feedback URL must require IAM so only CloudFront OAC can call it"
  }

  assert {
    condition     = aws_cloudwatch_log_group.feedback.retention_in_days == 3
    error_message = "feedback logs keep 3 days"
  }

  assert {
    condition     = contains([for o in output.api_origins : o.path_pattern], "/api/feedback")
    error_message = "api_origins must route /api/feedback"
  }

  assert {
    condition     = contains(keys(output.function_arns), "feedback")
    error_message = "function_arns must carry feedback so static_site grants CloudFront both invoke permissions"
  }
}

run "feedback_policy" {
  command = plan

  assert {
    condition     = aws_iam_role.feedback.name == "t-lab-feedback"
    error_message = "The feedback role must be <name>-lab-feedback."
  }

  assert {
    condition     = length(local.feedback_policy.Statement) == 3 && alltrue([for s in local.feedback_policy.Statement : s.Effect == "Allow"])
    error_message = "The feedback policy must be three Allow statements."
  }

  assert {
    condition = anytrue([
      for s in local.feedback_policy.Statement :
      s.Sid == "Counter" && s.Effect == "Allow" && s.Action == ["dynamodb:UpdateItem"] && s.Resource == ["arn:aws:dynamodb:us-east-1:111111111111:table/t-lab"] && s.Condition["ForAllValues:StringLike"]["dynamodb:LeadingKeys"] == ["feedback#*"]
    ])
    error_message = "The Counter statement must be UpdateItem on the one table, feedback# keys only."
  }

  assert {
    condition = anytrue([
      for s in local.feedback_policy.Statement :
      s.Sid == "Marks" && s.Effect == "Allow" && s.Action == ["dynamodb:PutItem"] && s.Resource == ["arn:aws:dynamodb:us-east-1:111111111111:table/t-lab"] && s.Condition["ForAllValues:StringLike"]["dynamodb:LeadingKeys"] == ["mark#*"]
    ])
    error_message = "The Marks statement must be PutItem on the one table, mark# keys only."
  }

  assert {
    condition = anytrue([
      for s in local.feedback_policy.Statement :
      s.Sid == "Logs" && s.Action == ["logs:CreateLogStream", "logs:PutLogEvents"] && s.Resource == ["arn:aws:logs:us-east-1:111111111111:log-group:/aws/lambda/t-lab-feedback:*"]
    ])
    error_message = "Logs must reach the feedback log group only."
  }

  assert {
    condition     = !anytrue([for s in local.feedback_policy.Statement : contains(s.Resource, "*")])
    error_message = "No feedback statement may use a wildcard resource."
  }
}
