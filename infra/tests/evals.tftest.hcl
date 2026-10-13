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
  name                  = "t"
  domain_name           = "example.com"
  delegation_set_id     = "N1234567890"
  mailboxes             = { marcm = "Marc M" }
  admin_mailbox         = "marcm"
  alert_email           = "alerts@example.com"
  github_subject_prefix = "repo:owner@1/repo@2"
}

run "eval_policy" {
  command = plan

  assert {
    condition     = length(data.aws_iam_policy_document.evals[0].statement) == 4 && tolist([for s in data.aws_iam_policy_document.evals[0].statement : s.sid]) == tolist(["NovaOnly", "NovaViaProfile", "GuardrailOnly", "GuardrailPointer"])
    error_message = "The eval policy must be exactly NovaOnly, NovaViaProfile, GuardrailOnly and GuardrailPointer, in that order."
  }

  assert {
    condition = alltrue([
      for s in data.aws_iam_policy_document.evals[0].statement :
      s.effect == null && length(s.principals) == 0 && s.not_actions == null && s.not_resources == null
    ])
    error_message = "Every eval statement must be a plain Allow on named actions and resources."
  }

  assert {
    condition = (
      toset(data.aws_iam_policy_document.evals[0].statement[0].actions) == toset(["bedrock:InvokeModel"]) &&
      toset(data.aws_iam_policy_document.evals[0].statement[0].resources) == toset(["arn:aws:bedrock:us-east-1:111111111111:inference-profile/us.amazon.nova-2-lite-v1:0"]) &&
      length(data.aws_iam_policy_document.evals[0].statement[0].condition) == 0
    )
    error_message = "NovaOnly must allow bedrock:InvokeModel on the one inference profile and nothing else."
  }

  assert {
    condition = (
      toset(data.aws_iam_policy_document.evals[0].statement[1].actions) == toset(["bedrock:InvokeModel"]) &&
      toset(data.aws_iam_policy_document.evals[0].statement[1].resources) == toset([
        "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-2-lite-v1:0",
        "arn:aws:bedrock:us-east-2::foundation-model/amazon.nova-2-lite-v1:0",
        "arn:aws:bedrock:us-west-2::foundation-model/amazon.nova-2-lite-v1:0",
      ]) &&
      length(data.aws_iam_policy_document.evals[0].statement[1].condition) == 1 &&
      one(data.aws_iam_policy_document.evals[0].statement[1].condition).test == "StringEquals" &&
      one(data.aws_iam_policy_document.evals[0].statement[1].condition).variable == "bedrock:InferenceProfileArn" &&
      toset(one(data.aws_iam_policy_document.evals[0].statement[1].condition).values) == toset(["arn:aws:bedrock:us-east-1:111111111111:inference-profile/us.amazon.nova-2-lite-v1:0"])
    )
    error_message = "NovaViaProfile must allow bedrock:InvokeModel on the three foundation models only through the inference profile."
  }

  assert {
    condition = (
      toset(data.aws_iam_policy_document.evals[0].statement[2].actions) == toset(["bedrock:ApplyGuardrail"]) &&
      toset(data.aws_iam_policy_document.evals[0].statement[2].resources) == toset(["arn:aws:bedrock:us-east-1:111111111111:guardrail/abc123"]) &&
      length(data.aws_iam_policy_document.evals[0].statement[2].condition) == 0
    )
    error_message = "GuardrailOnly must allow bedrock:ApplyGuardrail on the one guardrail."
  }

  assert {
    condition = (
      toset(data.aws_iam_policy_document.evals[0].statement[3].actions) == toset(["ssm:GetParameter"]) &&
      toset(data.aws_iam_policy_document.evals[0].statement[3].resources) == toset(["arn:aws:ssm:us-east-1:111111111111:parameter/t/labs/evals/guardrail"]) &&
      length(data.aws_iam_policy_document.evals[0].statement[3].condition) == 0
    )
    error_message = "GuardrailPointer must allow ssm:GetParameter on the one pointer parameter."
  }

  assert {
    condition = !anytrue([
      for v in flatten([
        for s in data.aws_iam_policy_document.evals[0].statement : concat(tolist(s.actions), tolist(s.resources))
      ]) : strcontains(v, "*")
    ])
    error_message = "No eval policy action or resource may contain a wildcard."
  }
}

run "eval_trust" {
  command = plan

  assert {
    condition     = length(data.aws_iam_policy_document.github_main_assume.statement) == 1 && toset(data.aws_iam_policy_document.github_main_assume.statement[0].actions) == toset(["sts:AssumeRoleWithWebIdentity"])
    error_message = "The trust document must be one sts:AssumeRoleWithWebIdentity statement."
  }

  assert {
    condition     = length(data.aws_iam_policy_document.github_main_assume.statement[0].principals) == 1 && one(data.aws_iam_policy_document.github_main_assume.statement[0].principals).type == "Federated" && toset(one(data.aws_iam_policy_document.github_main_assume.statement[0].principals).identifiers) == toset(["arn:aws:iam::111111111111:oidc-provider/token.actions.githubusercontent.com"])
    error_message = "Only the GitHub OIDC provider may assume the eval role."
  }

  assert {
    condition = length(data.aws_iam_policy_document.github_main_assume.statement[0].condition) == 2 && anytrue([
      for c in data.aws_iam_policy_document.github_main_assume.statement[0].condition :
      c.test == "StringEquals" && c.variable == "token.actions.githubusercontent.com:aud" && toset(c.values) == toset(["sts.amazonaws.com"])
    ])
    error_message = "The trust audience must be exactly sts.amazonaws.com."
  }

  assert {
    condition = anytrue([
      for c in data.aws_iam_policy_document.github_main_assume.statement[0].condition :
      c.test == "StringEquals" && c.variable == "token.actions.githubusercontent.com:sub" && length(c.values) == 1 && endswith(one(c.values), ":ref:refs/heads/main")
    ])
    error_message = "The trust subject must be pinned to refs/heads/main."
  }

  assert {
    condition     = aws_iam_role.evals[0].name == "t-github-evals"
    error_message = "The eval role must be <name>-github-evals."
  }
}

run "brake_role_set" {
  command = plan

  assert {
    condition     = module.lab_api[0].brake_role_names == toset(["t-lab", "t-lab-feedback", "t-lab-digest", "t-github-evals"])
    error_message = "The spend brake must deny exactly the lab, feedback, digest and eval roles."
  }
}
