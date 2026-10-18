resource "aws_iam_role" "evals" {
  count                = local.has_domain ? 1 : 0
  name                 = "${var.NAME}-github-evals"
  assume_role_policy   = data.aws_iam_policy_document.github_main_assume.json
  max_session_duration = 3600
}

resource "aws_ssm_parameter" "eval_guardrail" {
  count = local.has_domain ? 1 : 0
  name  = "/${var.NAME}/labs/evals/guardrail"
  type  = "String"
  value = jsonencode({
    id      = module.lab_api[0].lab_guardrail_id
    version = module.lab_api[0].lab_guardrail_version
  })
}

data "aws_iam_policy_document" "evals" {
  count = local.has_domain ? 1 : 0

  statement {
    sid       = "NovaOnly"
    actions   = ["bedrock:InvokeModel"]
    resources = [module.lab_api[0].lab_profile_arn]
  }
  statement {
    sid       = "NovaViaProfile"
    actions   = ["bedrock:InvokeModel"]
    resources = module.lab_api[0].lab_model_arns
    condition {
      test     = "StringEquals"
      variable = "bedrock:InferenceProfileArn"
      values   = [module.lab_api[0].lab_profile_arn]
    }
  }
  statement {
    sid       = "GuardrailOnly"
    actions   = ["bedrock:ApplyGuardrail"]
    resources = [module.lab_api[0].lab_guardrail_arn]
  }
  statement {
    sid       = "GuardrailPointer"
    actions   = ["ssm:GetParameter"]
    resources = [aws_ssm_parameter.eval_guardrail[0].arn]
  }
}

resource "aws_iam_role_policy" "evals" {
  count  = local.has_domain ? 1 : 0
  name   = "${var.NAME}-github-evals"
  role   = aws_iam_role.evals[0].id
  policy = data.aws_iam_policy_document.evals[0].json
}

output "evals_role_arn" {
  value = try(aws_iam_role.evals[0].arn, null)
}
