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
      Project   = var.PROJECT
      Env       = var.ENV
      ManagedBy = "terraform"
    }
  }
}

locals {
  has_domain = var.DOMAIN_NAME != ""
  hostnames  = [var.DOMAIN_NAME, "www.${var.DOMAIN_NAME}"]
  site_url   = local.has_domain ? "https://${var.DOMAIN_NAME}" : "https://${module.site.distribution_domain_name}"
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

module "mailserver" {
  count  = local.has_domain ? 1 : 0
  source = "./modules/mailserver"

  name           = var.NAME
  domain_name    = var.DOMAIN_NAME
  zone_id        = aws_route53_zone.this[0].zone_id
  mailboxes      = var.MAILBOXES
  admin_mailbox  = var.ADMIN_MAILBOX
  alert_email    = var.ALERT_EMAIL
  instance_type  = var.INSTANCE_TYPE
  mail_volume_gb = var.MAIL_VOLUME_GB
}

module "certificate" {
  count             = local.has_domain ? 1 : 0
  source            = "./modules/certificate"
  domain_name       = var.DOMAIN_NAME
  alternative_names = slice(local.hostnames, 1, length(local.hostnames))
  zone_id           = aws_route53_zone.this[0].zone_id
}

module "lab_api" {
  count  = local.has_domain ? 1 : 0
  source = "./modules/lab_api"

  name              = var.NAME
  package_dir       = "${path.module}/../app/api/dist"
  ses_identity_arn  = module.mailserver[0].ses_identity_arn
  contact_from      = "website@${var.DOMAIN_NAME}"
  contact_to        = "${var.ADMIN_MAILBOX}@${var.DOMAIN_NAME}"
  alert_email       = var.ALERT_EMAIL
  alarm_topic_arn   = module.mailserver[0].alerts_topic_arn
  brake_extra_roles = { for role in aws_iam_role.evals : "evals" => { name = role.name, arn = role.arn } }
}

module "site" {
  source            = "./modules/static_site"
  name              = var.NAME
  aliases           = local.has_domain ? local.hostnames : []
  certificate_arn   = one(module.certificate[*].certificate_arn)
  force_destroy     = !var.PROTECT_DATA
  api_origins       = local.has_domain ? module.lab_api[0].api_origins : []
  api_function_arns = local.has_domain ? module.lab_api[0].function_arns : {}
}
