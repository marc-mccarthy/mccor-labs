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
  has_domain = var.domain_name != ""
  hostnames  = [var.domain_name, "www.${var.domain_name}"]
  site_url   = local.has_domain ? "https://${var.domain_name}" : "https://${module.site.distribution_domain_name}"
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

module "mailserver" {
  count  = local.has_domain ? 1 : 0
  source = "./modules/mailserver"

  name           = var.name
  domain_name    = var.domain_name
  zone_id        = aws_route53_zone.this[0].zone_id
  mailboxes      = var.mailboxes
  admin_mailbox  = var.admin_mailbox
  alert_email    = var.alert_email
  instance_type  = var.instance_type
  mail_volume_gb = var.mail_volume_gb
}

module "certificate" {
  count             = local.has_domain ? 1 : 0
  source            = "./modules/certificate"
  domain_name       = var.domain_name
  alternative_names = slice(local.hostnames, 1, length(local.hostnames))
  zone_id           = aws_route53_zone.this[0].zone_id
}

module "site" {
  source          = "./modules/static_site"
  name            = var.name
  aliases         = local.has_domain ? local.hostnames : []
  certificate_arn = one(module.certificate[*].certificate_arn)
  force_destroy   = !var.protect_data
}
