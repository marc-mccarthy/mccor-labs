locals {
  brake_roles = {
    lab = { name = aws_iam_role.lab.name, arn = aws_iam_role.lab.arn }
  }

  lab_brake_deny_policy = {
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Deny"
      Action   = ["bedrock:*"]
      Resource = ["*"]
    }]
  }

  lab_brake_assume_policy = {
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "budgets.amazonaws.com" }
      Condition = { StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id } }
    }]
  }

  lab_brake_policy = {
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AttachDeny"
      Effect    = "Allow"
      Action    = ["iam:AttachRolePolicy", "iam:DetachRolePolicy"]
      Resource  = [for role in values(local.brake_roles) : role.arn]
      Condition = { ArnEquals = { "iam:PolicyARN" = aws_iam_policy.lab_brake_deny.arn } }
    }]
  }
}

resource "aws_budgets_budget" "lab_brake" {
  name         = "${var.name}-lab-brake"
  budget_type  = "COST"
  limit_amount = tostring(var.brake_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
}

resource "aws_iam_policy" "lab_brake_deny" {
  name   = "${var.name}-lab-brake-deny"
  policy = jsonencode(local.lab_brake_deny_policy)
}

resource "aws_iam_role" "lab_brake" {
  name               = "${var.name}-lab-brake"
  assume_role_policy = jsonencode(local.lab_brake_assume_policy)
}

resource "aws_iam_role_policy" "lab_brake" {
  name   = "lab-brake"
  role   = aws_iam_role.lab_brake.id
  policy = jsonencode(local.lab_brake_policy)
}

resource "aws_budgets_budget_action" "lab_brake" {
  budget_name        = aws_budgets_budget.lab_brake.name
  action_type        = "APPLY_IAM_POLICY"
  approval_model     = "AUTOMATIC"
  notification_type  = "ACTUAL"
  execution_role_arn = aws_iam_role.lab_brake.arn

  action_threshold {
    action_threshold_type  = "PERCENTAGE"
    action_threshold_value = 100
  }

  definition {
    iam_action_definition {
      policy_arn = aws_iam_policy.lab_brake_deny.arn
      roles      = [for role in values(local.brake_roles) : role.name]
    }
  }

  subscriber {
    address           = var.alert_email
    subscription_type = "EMAIL"
  }

  depends_on = [aws_iam_role_policy.lab_brake]
}
