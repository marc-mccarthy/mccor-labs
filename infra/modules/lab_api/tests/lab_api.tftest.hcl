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
  target          = aws_lambda_function_url.contact
  override_during = plan
  values          = { function_url = "https://abc123.lambda-url.us-east-1.on.aws/" }
}

override_resource {
  target          = aws_lambda_function.contact
  override_during = plan
  values          = { arn = "arn:aws:lambda:us-east-1:111111111111:function:t-contact" }
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

run "storage_and_role" {
  command = plan

  assert {
    condition     = aws_dynamodb_table.lab.name == "t-lab" && aws_dynamodb_table.lab.hash_key == "pk"
    error_message = "Table must be <name>-lab keyed by pk."
  }

  assert {
    condition     = aws_dynamodb_table.lab.billing_mode == "PAY_PER_REQUEST"
    error_message = "Table must be on-demand."
  }

  assert {
    condition     = aws_dynamodb_table.lab.ttl[0].attribute_name == "expiresAt" && aws_dynamodb_table.lab.ttl[0].enabled
    error_message = "TTL must be on expiresAt."
  }

  assert {
    condition     = aws_cloudwatch_log_group.contact.name == "/aws/lambda/t-contact" && aws_cloudwatch_log_group.contact.retention_in_days == 3
    error_message = "Contact logs must be kept 3 days."
  }

  assert {
    condition = anytrue([
      for s in local.contact_policy.Statement :
      s.Action == ["ses:SendEmail"] && s.Resource == ["arn:aws:ses:us-east-1:111111111111:identity/example.com"] && s.Condition.StringEquals["ses:FromAddress"] == "website@example.com"
    ])
    error_message = "SES must be SendEmail on the one identity from the one address."
  }

  assert {
    condition = anytrue([
      for s in local.contact_policy.Statement :
      s.Action == ["dynamodb:UpdateItem"] && s.Resource == ["arn:aws:dynamodb:us-east-1:111111111111:table/t-lab"] && s.Condition["ForAllValues:StringLike"]["dynamodb:LeadingKeys"] == ["contact#*"]
    ])
    error_message = "The counter statement must be UpdateItem on the one table and contact# keys only."
  }

  assert {
    condition = anytrue([
      for s in local.contact_policy.Statement :
      s.Sid == "Logs" && s.Action == ["logs:CreateLogStream", "logs:PutLogEvents"] && s.Resource == ["arn:aws:logs:us-east-1:111111111111:log-group:/aws/lambda/t-contact:*"]
    ])
    error_message = "Logs must be CreateLogStream and PutLogEvents on the contact log group only."
  }

  assert {
    condition     = length(local.contact_policy.Statement) == 3
    error_message = "The contact role must carry exactly logs, counter and mail."
  }
}

run "function" {
  command = plan

  assert {
    condition     = aws_lambda_function.contact.runtime == "nodejs24.x" && tolist(aws_lambda_function.contact.architectures) == tolist(["arm64"])
    error_message = "Contact must run nodejs24.x on arm64."
  }

  assert {
    condition     = aws_lambda_function.contact.handler == "index.handler" && aws_lambda_function.contact.timeout == 10 && aws_lambda_function.contact.memory_size == 256
    error_message = "Handler, timeout or memory drifted."
  }

  assert {
    condition = aws_lambda_function.contact.environment[0].variables == tomap({
      TABLE_NAME        = "t-lab"
      CONTACT_DAILY_CAP = "50"
      CONTACT_FROM      = "website@example.com"
      CONTACT_TO        = "owner@example.com"
    })
    error_message = "Contact environment variables drifted."
  }

  assert {
    condition     = aws_lambda_function_url.contact.authorization_type == "AWS_IAM"
    error_message = "The Function URL must require IAM so only CloudFront OAC can call it."
  }

  assert {
    condition = output.api_origins == [
      { path_pattern = "/api/contact", function_url_domain = "abc123.lambda-url.us-east-1.on.aws" },
      { path_pattern = "/api/feedback", function_url_domain = "fb123.lambda-url.us-east-1.on.aws" },
    ]
    error_message = "api_origins must carry the path and the bare Function URL host."
  }

  assert {
    condition = output.function_arns == {
      contact  = "arn:aws:lambda:us-east-1:111111111111:function:t-contact"
      feedback = "arn:aws:lambda:us-east-1:111111111111:function:t-lab-feedback"
    }
    error_message = "function_arns must be keyed by function name."
  }
}
