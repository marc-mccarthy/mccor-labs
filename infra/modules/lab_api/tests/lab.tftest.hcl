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

variables {
  name             = "t"
  package_dir      = "../../../app/api/dist"
  ses_identity_arn = "arn:aws:ses:us-east-1:111111111111:identity/example.com"
  contact_from     = "website@example.com"
  contact_to       = "owner@example.com"
}

run "guardrail" {
  command = plan

  assert {
    condition     = length([for f in aws_bedrock_guardrail.lab.content_policy_config[0].filters_config : f if f.type == "PROMPT_ATTACK"]) == 1
    error_message = "The lab guardrail must filter prompt attacks."
  }

  assert {
    condition     = length(aws_bedrock_guardrail.lab.content_policy_config[0].filters_config) == 6
    error_message = "The lab guardrail must set all five content filters plus prompt attack."
  }
}
