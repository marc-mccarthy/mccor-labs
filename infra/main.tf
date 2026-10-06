terraform {
  required_version = "~> 1.16"

  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 6.63" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = var.name
      ManagedBy = "terraform"
    }
  }
}

locals {
  hostnames = [var.domain_name, "www.${var.domain_name}"]
  site_urls = [for h in local.hostnames : "https://${h}"]
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

resource "aws_budgets_budget" "monthly" {
  name         = "${var.name}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
}

module "mailserver" {
  source = "./modules/mailserver"

  domain_name    = var.domain_name
  zone_id        = aws_route53_zone.this.zone_id
  mailboxes      = var.mailboxes
  admin_mailbox  = var.admin_mailbox
  alert_email    = var.alert_email
  instance_type  = var.instance_type
  mail_volume_gb = var.mail_volume_gb
}

module "certificate" {
  source            = "./modules/certificate"
  domain_name       = local.hostnames[0]
  alternative_names = slice(local.hostnames, 1, length(local.hostnames))
  zone_id           = aws_route53_zone.this.zone_id
}

module "site" {
  source          = "./modules/static_site"
  name            = var.name
  aliases         = local.hostnames
  certificate_arn = module.certificate.certificate_arn
  force_destroy   = !var.protect_data
}
