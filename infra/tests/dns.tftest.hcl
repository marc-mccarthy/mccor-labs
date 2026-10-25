mock_provider "aws" {
  mock_data "aws_iam_policy_document" {
    defaults = { json = "{\"Version\":\"2012-10-17\"}" }
  }
}

override_module {
  target = module.mailserver
  outputs = {
    ses_identity_arn = "arn:aws:ses:us-east-1:111111111111:identity/example.com"
  }
}

override_module {
  target = module.certificate
  outputs = {
    certificate_arn = "arn:aws:acm:us-east-1:111111111111:certificate/abc"
  }
}

override_module {
  target = module.site
  outputs = {
    bucket_name                 = "t-site"
    distribution_id             = "EABC"
    distribution_domain_name    = "d1.cloudfront.net"
    distribution_hosted_zone_id = "Z2FDTNDATAQYW2"
  }
}

override_resource {
  target          = module.lab_api[0].aws_bedrock_guardrail.lab
  override_during = plan
  values          = { guardrail_arn = "arn:aws:bedrock:us-east-1:111111111111:guardrail/abc123" }
}

override_data {
  target = module.lab_api[0].data.aws_caller_identity.current
  values = { account_id = "111111111111" }
}

override_data {
  target = data.aws_iam_openid_connect_provider.github
  values = { arn = "arn:aws:iam::111111111111:oidc-provider/token.actions.githubusercontent.com" }
}

override_data {
  target = data.aws_caller_identity.current
  values = { account_id = "111111111111" }
}

override_resource {
  target          = aws_iam_role.evals
  override_during = plan
  values          = { arn = "arn:aws:iam::111111111111:role/t-github-evals", name = "t-github-evals" }
}

override_resource {
  target          = aws_ssm_parameter.eval_guardrail
  override_during = plan
  values          = { arn = "arn:aws:ssm:us-east-1:111111111111:parameter/t/labs/evals/guardrail" }
}

variables {
  NAME                  = "t"
  DOMAIN_NAME           = "example.com"
  DELEGATION_SET_ID     = "N1234567890"
  MAILBOXES             = { marcm = "Marc M" }
  ADMIN_MAILBOX         = "marcm"
  ALERT_EMAIL           = "alerts@example.com"
  GITHUB_SUBJECT_PREFIX = "repo:owner@1/repo@2"
}

run "caa_records" {
  command = plan

  assert {
    condition     = aws_route53_record.caa[0].name == "example.com" && aws_route53_record.caa[0].type == "CAA"
    error_message = "The CAA record must sit at the zone apex."
  }

  assert {
    condition     = toset(aws_route53_record.caa[0].records) == toset(["0 issue \"amazon.com\"", "0 issue \"letsencrypt.org\"", "0 issuewild \";\""])
    error_message = "CAA must allow only ACM and Let's Encrypt and forbid wildcard certificates."
  }
}
