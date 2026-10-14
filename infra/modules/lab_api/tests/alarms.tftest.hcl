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

override_data {
  target = data.aws_region.current
  values = { region = "us-east-1" }
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

override_resource {
  target          = aws_iam_role.digest_scheduler
  override_during = plan
  values = {
    id  = "t-lab-digest-scheduler"
    arn = "arn:aws:iam::111111111111:role/t-lab-digest-scheduler"
  }
}

override_resource {
  target          = aws_sqs_queue.digest_dlq
  override_during = plan
  values = {
    arn = "arn:aws:sqs:us-east-1:111111111111:t-lab-digest-dlq"
    url = "https://sqs.us-east-1.amazonaws.com/111111111111/t-lab-digest-dlq"
  }
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

run "url_5xx_alarms" {
  command = plan

  assert {
    condition     = toset(keys(aws_cloudwatch_metric_alarm.url_5xx)) == toset(["contact", "feedback"])
    error_message = "Url5xxCount alarms must cover exactly the contact and feedback functions."
  }

  assert {
    condition = alltrue([
      for alarm in values(aws_cloudwatch_metric_alarm.url_5xx) :
      alarm.namespace == "AWS/Lambda" && alarm.metric_name == "Url5xxCount" && alarm.statistic == "Sum" && alarm.threshold == 1 && alarm.comparison_operator == "GreaterThanOrEqualToThreshold" && alarm.period == 300 && alarm.evaluation_periods == 1 && alarm.treat_missing_data == "notBreaching"
    ])
    error_message = "Each Url5xxCount alarm must fire on a Sum of at least 1 in one 300 s period, with missing data not breaching."
  }

  assert {
    condition     = aws_cloudwatch_metric_alarm.url_5xx["contact"].dimensions == tomap({ FunctionName = "t-contact" })
    error_message = "The contact Url5xxCount alarm must watch only the t-contact function."
  }

  assert {
    condition     = aws_cloudwatch_metric_alarm.url_5xx["feedback"].dimensions == tomap({ FunctionName = "t-lab-feedback" })
    error_message = "The feedback Url5xxCount alarm must watch only the t-lab-feedback function."
  }

  assert {
    condition     = aws_cloudwatch_metric_alarm.url_5xx["contact"].alarm_name == "t-contact-url-5xx" && aws_cloudwatch_metric_alarm.url_5xx["feedback"].alarm_name == "t-lab-feedback-url-5xx"
    error_message = "Url5xxCount alarms must be named <function name>-url-5xx."
  }
}

run "digest_alarms" {
  command = plan

  assert {
    condition     = aws_cloudwatch_metric_alarm.digest_errors.namespace == "AWS/Lambda" && aws_cloudwatch_metric_alarm.digest_errors.metric_name == "Errors" && aws_cloudwatch_metric_alarm.digest_errors.statistic == "Sum"
    error_message = "The digest must have a Lambda Errors Sum alarm."
  }

  assert {
    condition     = aws_cloudwatch_metric_alarm.digest_errors.threshold == 1 && aws_cloudwatch_metric_alarm.digest_errors.comparison_operator == "GreaterThanOrEqualToThreshold" && aws_cloudwatch_metric_alarm.digest_errors.period == 300 && aws_cloudwatch_metric_alarm.digest_errors.evaluation_periods == 1 && aws_cloudwatch_metric_alarm.digest_errors.treat_missing_data == "notBreaching"
    error_message = "The digest Errors alarm must fire on one error in one 300 s period, with missing data not breaching."
  }

  assert {
    condition     = aws_cloudwatch_metric_alarm.digest_errors.dimensions == tomap({ FunctionName = "t-lab-digest" })
    error_message = "The digest Errors alarm must watch only the t-lab-digest function."
  }

  assert {
    condition     = aws_cloudwatch_metric_alarm.digest_async_dropped.namespace == "AWS/Lambda" && aws_cloudwatch_metric_alarm.digest_async_dropped.metric_name == "AsyncEventsDropped" && aws_cloudwatch_metric_alarm.digest_async_dropped.statistic == "Sum"
    error_message = "The digest must have a Lambda AsyncEventsDropped Sum alarm."
  }

  assert {
    condition     = aws_cloudwatch_metric_alarm.digest_async_dropped.threshold == 1 && aws_cloudwatch_metric_alarm.digest_async_dropped.comparison_operator == "GreaterThanOrEqualToThreshold" && aws_cloudwatch_metric_alarm.digest_async_dropped.period == 300 && aws_cloudwatch_metric_alarm.digest_async_dropped.evaluation_periods == 1 && aws_cloudwatch_metric_alarm.digest_async_dropped.treat_missing_data == "notBreaching"
    error_message = "The digest AsyncEventsDropped alarm must fire on one dropped event in one 300 s period, with missing data not breaching."
  }

  assert {
    condition     = aws_cloudwatch_metric_alarm.digest_async_dropped.dimensions == tomap({ FunctionName = "t-lab-digest" })
    error_message = "The digest AsyncEventsDropped alarm must watch only the t-lab-digest function."
  }

  assert {
    condition     = aws_cloudwatch_metric_alarm.digest_errors.alarm_name == "t-lab-digest-errors" && aws_cloudwatch_metric_alarm.digest_async_dropped.alarm_name == "t-lab-digest-async-dropped"
    error_message = "Digest alarms must be named <name>-lab-digest-errors and <name>-lab-digest-async-dropped."
  }
}

run "digest_dlq" {
  command = plan

  assert {
    condition     = aws_sqs_queue.digest_dlq.name == "t-lab-digest-dlq"
    error_message = "The digest DLQ must be named <name>-lab-digest-dlq."
  }

  assert {
    condition     = aws_sqs_queue.digest_dlq.sqs_managed_sse_enabled == true
    error_message = "The digest DLQ must use SQS-managed encryption."
  }

  assert {
    condition     = aws_sqs_queue.digest_dlq.message_retention_seconds == 1209600
    error_message = "The digest DLQ must keep messages for the 14-day maximum."
  }

  assert {
    condition     = length(aws_scheduler_schedule.digest.target[0].dead_letter_config) == 1 && aws_scheduler_schedule.digest.target[0].dead_letter_config[0].arn == "arn:aws:sqs:us-east-1:111111111111:t-lab-digest-dlq"
    error_message = "The digest schedule target must dead-letter to the digest DLQ."
  }

  assert {
    condition     = aws_cloudwatch_metric_alarm.digest_dlq_visible.namespace == "AWS/SQS" && aws_cloudwatch_metric_alarm.digest_dlq_visible.metric_name == "ApproximateNumberOfMessagesVisible" && aws_cloudwatch_metric_alarm.digest_dlq_visible.statistic == "Maximum"
    error_message = "The DLQ alarm must watch the Maximum of ApproximateNumberOfMessagesVisible."
  }

  assert {
    condition     = aws_cloudwatch_metric_alarm.digest_dlq_visible.threshold == 1 && aws_cloudwatch_metric_alarm.digest_dlq_visible.comparison_operator == "GreaterThanOrEqualToThreshold" && aws_cloudwatch_metric_alarm.digest_dlq_visible.period == 300 && aws_cloudwatch_metric_alarm.digest_dlq_visible.evaluation_periods == 1 && aws_cloudwatch_metric_alarm.digest_dlq_visible.treat_missing_data == "notBreaching"
    error_message = "The DLQ alarm must fire on one visible message in one 300 s period, with missing data not breaching."
  }

  assert {
    condition     = aws_cloudwatch_metric_alarm.digest_dlq_visible.dimensions == tomap({ QueueName = "t-lab-digest-dlq" })
    error_message = "The DLQ alarm must watch only the digest DLQ."
  }

  assert {
    condition     = aws_cloudwatch_metric_alarm.digest_dlq_visible.alarm_name == "t-lab-digest-dlq-visible"
    error_message = "The DLQ alarm must be named <name>-lab-digest-dlq-visible."
  }
}

run "digest_dlq_policy" {
  command = plan

  assert {
    condition     = aws_iam_role_policy.digest_scheduler_dlq.role == "t-lab-digest-scheduler"
    error_message = "The DLQ grant must attach to the digest scheduler role."
  }

  assert {
    condition     = jsondecode(aws_iam_role_policy.digest_scheduler_dlq.policy).Statement == [{ Sid = "DeadLetter", Effect = "Allow", Action = ["sqs:SendMessage"], Resource = ["arn:aws:sqs:us-east-1:111111111111:t-lab-digest-dlq"] }]
    error_message = "The scheduler role may send only sqs:SendMessage, and only to the digest DLQ."
  }

  assert {
    condition = alltrue([
      for s in concat(local.digest_scheduler_policy.Statement, local.digest_scheduler_dlq_policy.Statement) :
      s.Resource == ["arn:aws:sqs:us-east-1:111111111111:t-lab-digest-dlq"]
      if contains(s.Action, "sqs:SendMessage")
    ])
    error_message = "Every scheduler sqs:SendMessage grant must target the digest DLQ ARN exactly."
  }

  assert {
    condition     = anytrue([for s in local.digest_scheduler_dlq_policy.Statement : contains(s.Action, "sqs:SendMessage")])
    error_message = "The scheduler role must be able to send to the digest DLQ."
  }
}

run "alarm_actions" {
  command = plan

  assert {
    condition = alltrue([
      for alarm in concat(values(aws_cloudwatch_metric_alarm.url_5xx), [aws_cloudwatch_metric_alarm.digest_errors, aws_cloudwatch_metric_alarm.digest_async_dropped, aws_cloudwatch_metric_alarm.digest_dlq_visible]) :
      toset(alarm.alarm_actions) == toset(["arn:aws:sns:us-east-1:111111111111:t-alerts"])
    ])
    error_message = "Every alarm must notify only the alarm topic."
  }
}
