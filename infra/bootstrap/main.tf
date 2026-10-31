terraform {
  required_version = "~> 1.16"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.63" }
  }
}
provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = {
      Project   = var.PROJECT
      Env       = var.ENV
      ManagedBy = "terraform"
      Stack     = "bootstrap"
    }
  }
}
data "aws_caller_identity" "current" {}
resource "aws_budgets_budget" "monthly" {
  count        = var.ENABLE_BUDGET ? 1 : 0
  name         = "${var.NAME}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.MONTHLY_BUDGET_USD)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.ALERT_EMAIL]
  }
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.ALERT_EMAIL]
  }
}
