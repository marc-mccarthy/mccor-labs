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

override_resource {
  target          = aws_cloudwatch_log_group.digest
  override_during = plan
  values          = { arn = "arn:aws:logs:us-east-1:111111111111:log-group:/aws/lambda/t-lab-digest" }
}

override_resource {
  target          = aws_lambda_function.digest
  override_during = plan
  values          = { arn = "arn:aws:lambda:us-east-1:111111111111:function:t-lab-digest" }
}

override_resource {
  target          = aws_iam_role.digest
  override_during = plan
  values          = { arn = "arn:aws:iam::111111111111:role/t-lab-digest" }
}

override_data {
  target = data.aws_region.current
  values = { region = "us-east-1" }
}

variables {
  name             = "t"
  package_dir      = "../../../app/api/dist"
  ses_identity_arn = "arn:aws:ses:us-east-1:111111111111:identity/example.com"
  contact_from     = "website@example.com"
  contact_to       = "owner@example.com"
  alert_email      = "alerts@example.com"
}

run "digest_schedule" {
  command = plan

  assert {
    condition     = aws_scheduler_schedule.digest.schedule_expression == "cron(0 8 ? * MON *)" && aws_scheduler_schedule.digest.schedule_expression_timezone == "America/Chicago"
    error_message = "digest runs Mondays 08:00 Chicago time"
  }

  assert {
    condition     = aws_scheduler_schedule.digest.flexible_time_window[0].mode == "OFF"
    error_message = "digest has no flexible window"
  }

  assert {
    condition     = aws_scheduler_schedule.digest.target[0].retry_policy[0].maximum_retry_attempts == 2
    error_message = "digest retries at most twice"
  }

  assert {
    condition     = aws_lambda_function_event_invoke_config.digest.maximum_retry_attempts == 0
    error_message = "digest must not retry on function errors, so a failed run cannot send the email twice"
  }

  assert {
    condition     = aws_scheduler_schedule.digest.target[0].arn == "arn:aws:lambda:us-east-1:111111111111:function:t-lab-digest"
    error_message = "digest schedule must target the digest function"
  }

  assert {
    condition     = aws_lambda_function.digest.environment[0].variables["DIGEST_FROM"] == var.contact_from && aws_lambda_function.digest.environment[0].variables["DIGEST_TO"] == var.contact_to
    error_message = "digest sends from the contact sender to the owner"
  }

  assert {
    condition     = aws_lambda_function.digest.environment[0].variables["TABLE_NAME"] == "t-lab"
    error_message = "digest must use the lab table"
  }

  assert {
    condition     = aws_lambda_function.digest.runtime == "nodejs24.x" && tolist(aws_lambda_function.digest.architectures) == tolist(["arm64"]) && aws_lambda_function.digest.handler == "index.handler"
    error_message = "digest must be Node 24 on arm64"
  }

  assert {
    condition     = aws_cloudwatch_log_group.digest.retention_in_days == 3
    error_message = "digest logs keep 3 days"
  }
}

run "digest_policy" {
  command = plan

  assert {
    condition     = aws_iam_role.digest.name == "t-lab-digest"
    error_message = "The digest role must be <name>-lab-digest."
  }

  assert {
    condition     = length(local.digest_policy.Statement) == 3 && alltrue([for s in local.digest_policy.Statement : s.Effect == "Allow"])
    error_message = "The digest policy must be three Allow statements."
  }

  assert {
    condition = anytrue([
      for s in local.digest_policy.Statement :
      s.Action == ["dynamodb:Scan"] && s.Resource == ["arn:aws:dynamodb:us-east-1:111111111111:table/t-lab"]
    ])
    error_message = "The digest may only Scan the one table."
  }

  assert {
    condition = anytrue([
      for s in local.digest_policy.Statement :
      s.Action == ["ses:SendEmail"] && s.Resource == ["arn:aws:ses:us-east-1:111111111111:identity/example.com"] && s.Condition.StringEquals["ses:FromAddress"] == "website@example.com"
    ])
    error_message = "The digest may send mail only from the contact sender through the one SES identity."
  }

  assert {
    condition = anytrue([
      for s in local.digest_policy.Statement :
      s.Sid == "Logs" && s.Action == ["logs:CreateLogStream", "logs:PutLogEvents"] && s.Resource == ["arn:aws:logs:us-east-1:111111111111:log-group:/aws/lambda/t-lab-digest:*"]
    ])
    error_message = "Logs must reach the digest log group only."
  }

  assert {
    condition     = !anytrue([for s in local.digest_policy.Statement : contains(s.Resource, "*")])
    error_message = "No digest statement may use a wildcard resource."
  }
}

run "digest_scheduler_trust" {
  command = plan

  assert {
    condition     = aws_iam_role.digest_scheduler.name == "t-lab-digest-scheduler"
    error_message = "The scheduler role must be <name>-lab-digest-scheduler."
  }

  assert {
    condition     = length(local.digest_scheduler_assume_policy.Statement) == 1 && local.digest_scheduler_assume_policy.Statement[0].Principal.Service == "scheduler.amazonaws.com"
    error_message = "Only EventBridge Scheduler may assume the scheduler role."
  }

  assert {
    condition     = local.digest_scheduler_assume_policy.Statement[0].Condition.StringEquals["aws:SourceAccount"] == "111111111111" && local.digest_scheduler_assume_policy.Statement[0].Condition.StringEquals["aws:SourceArn"] == "arn:aws:scheduler:us-east-1:111111111111:schedule-group/default"
    error_message = "The scheduler trust must be pinned to this account and the default schedule group."
  }

  assert {
    condition     = length(local.digest_scheduler_policy.Statement) == 1 && local.digest_scheduler_policy.Statement[0].Action == ["lambda:InvokeFunction"] && local.digest_scheduler_policy.Statement[0].Resource == ["arn:aws:lambda:us-east-1:111111111111:function:t-lab-digest"]
    error_message = "The scheduler role may invoke only the digest function."
  }
}
