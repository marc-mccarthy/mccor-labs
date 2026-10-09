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
      s.Action == ["dynamodb:UpdateItem"] && s.Condition["ForAllValues:StringLike"]["dynamodb:LeadingKeys"] == ["contact#*"]
    ])
    error_message = "The counter statement must be UpdateItem on contact# keys only."
  }

  assert {
    condition     = length(local.contact_policy.Statement) == 3
    error_message = "The contact role must carry exactly logs, counter and mail."
  }
}
