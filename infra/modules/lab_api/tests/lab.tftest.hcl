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

run "kill_flag_and_logs" {
  command = plan

  assert {
    condition     = aws_ssm_parameter.lab_enabled.name == "/mccorlabs/labs/should-this-be-ai/enabled" && aws_ssm_parameter.lab_enabled.value == "false"
    error_message = "The kill flag must start off at the fixed parameter name."
  }

  assert {
    condition     = aws_cloudwatch_log_group.lab.name == "/aws/lambda/t-lab" && aws_cloudwatch_log_group.lab.retention_in_days == 3
    error_message = "Lab logs must be kept 3 days."
  }
}

run "lab_policy" {
  command = plan

  assert {
    condition = toset(flatten([for s in local.lab_policy.Statement : s.Action])) == toset([
      "bedrock:InvokeModel",
      "bedrock:ApplyGuardrail",
      "dynamodb:UpdateItem",
      "ssm:GetParameter",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ])
    error_message = "The lab role must carry exactly invoke, guardrail, counter, kill-flag and logs actions."
  }

  assert {
    condition     = length(local.lab_policy.Statement) == 6 && alltrue([for s in local.lab_policy.Statement : s.Effect == "Allow"])
    error_message = "The lab policy must be six Allow statements."
  }

  assert {
    condition     = !anytrue([for s in local.lab_policy.Statement : contains(s.Resource, "*")])
    error_message = "No lab statement may use a wildcard resource."
  }

  assert {
    condition = anytrue([
      for s in local.lab_policy.Statement :
      s.Sid == "InvokeProfile" && s.Resource == ["arn:aws:bedrock:us-east-1:111111111111:inference-profile/us.amazon.nova-2-lite-v1:0"]
    ])
    error_message = "InvokeProfile must reach the one inference profile."
  }

  assert {
    condition = anytrue([
      for s in local.lab_policy.Statement :
      s.Sid == "InvokeModelViaProfile" && s.Resource == [
        "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-2-lite-v1:0",
        "arn:aws:bedrock:us-east-2::foundation-model/amazon.nova-2-lite-v1:0",
        "arn:aws:bedrock:us-west-2::foundation-model/amazon.nova-2-lite-v1:0",
      ] && s.Condition.StringEquals["bedrock:InferenceProfileArn"] == "arn:aws:bedrock:us-east-1:111111111111:inference-profile/us.amazon.nova-2-lite-v1:0"
    ])
    error_message = "Foundation models must be reachable only through the profile."
  }

  assert {
    condition = anytrue([
      for s in local.lab_policy.Statement :
      s.Action == ["bedrock:ApplyGuardrail"] && s.Resource == ["arn:aws:bedrock:us-east-1:111111111111:guardrail/abc123"]
    ])
    error_message = "ApplyGuardrail must reach the one lab guardrail."
  }

  assert {
    condition = anytrue([
      for s in local.lab_policy.Statement :
      s.Action == ["dynamodb:UpdateItem"] && s.Resource == ["arn:aws:dynamodb:us-east-1:111111111111:table/t-lab"] && s.Condition["ForAllValues:StringLike"]["dynamodb:LeadingKeys"] == ["lab-race#*", "lab-argue#*"]
    ])
    error_message = "The counter statement must be UpdateItem on the one table and lab-race# and lab-argue# keys only."
  }

  assert {
    condition = anytrue([
      for s in local.lab_policy.Statement :
      s.Action == ["ssm:GetParameter"] && s.Resource == ["arn:aws:ssm:us-east-1:111111111111:parameter/mccorlabs/labs/should-this-be-ai/enabled"]
    ])
    error_message = "GetParameter must reach the kill flag only."
  }

  assert {
    condition = anytrue([
      for s in local.lab_policy.Statement :
      s.Sid == "Logs" && s.Resource == ["arn:aws:logs:us-east-1:111111111111:log-group:/aws/lambda/t-lab:*"]
    ])
    error_message = "Logs must reach the lab log group only."
  }

  assert {
    condition     = aws_iam_role.lab.name == "t-lab"
    error_message = "The lab role must be <name>-lab."
  }
}

run "brake" {
  command = plan

  assert {
    condition     = aws_budgets_budget.lab_brake.name == "t-lab-brake" && aws_budgets_budget.lab_brake.limit_amount == "22" && aws_budgets_budget.lab_brake.limit_unit == "USD" && aws_budgets_budget.lab_brake.budget_type == "COST"
    error_message = "The brake budget must be a 22 USD monthly cost budget of its own."
  }

  assert {
    condition     = aws_budgets_budget_action.lab_brake.action_type == "APPLY_IAM_POLICY" && aws_budgets_budget_action.lab_brake.approval_model == "AUTOMATIC" && aws_budgets_budget_action.lab_brake.notification_type == "ACTUAL"
    error_message = "The brake must apply an IAM policy automatically on actual spend."
  }

  assert {
    condition     = aws_budgets_budget_action.lab_brake.action_threshold[0].action_threshold_type == "PERCENTAGE" && aws_budgets_budget_action.lab_brake.action_threshold[0].action_threshold_value == 100
    error_message = "The brake must fire at 100 percent of the brake budget."
  }

  assert {
    condition     = contains(aws_budgets_budget_action.lab_brake.definition[0].iam_action_definition[0].roles, aws_iam_role.lab.name)
    error_message = "The brake must attach the deny policy to the lab role."
  }

  assert {
    condition     = keys(local.brake_roles) == ["lab"]
    error_message = "The brake must list only the lab role in this phase."
  }

  assert {
    condition     = length(local.lab_brake_deny_policy.Statement) == 1 && local.lab_brake_deny_policy.Statement[0].Effect == "Deny" && local.lab_brake_deny_policy.Statement[0].Action == ["bedrock:*"]
    error_message = "The deny policy must be one Deny statement on bedrock:*."
  }

  assert {
    condition     = local.lab_brake_policy.Statement[0].Action == ["iam:AttachRolePolicy", "iam:DetachRolePolicy"] && local.lab_brake_policy.Statement[0].Resource == ["arn:aws:iam::111111111111:role/t-lab"] && local.lab_brake_policy.Statement[0].Condition.ArnEquals["iam:PolicyARN"] == "arn:aws:iam::111111111111:policy/t-lab-brake-deny"
    error_message = "The Budgets role may attach and detach only the deny policy, on the lab role only."
  }

  assert {
    condition     = local.lab_brake_assume_policy.Statement[0].Principal.Service == "budgets.amazonaws.com"
    error_message = "Only AWS Budgets may assume the brake role."
  }
}
