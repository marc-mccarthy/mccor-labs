locals {
  env_id    = terraform.workspace == "default" ? "" : terraform.workspace
  is_main   = local.env_id == ""
  name      = local.is_main ? var.project : "${var.project}-${local.env_id}"
  hostnames = local.is_main ? [var.domain_name, "www.${var.domain_name}"] : ["${local.env_id}.${var.domain_name}"]
  site_urls = [for h in local.hostnames : "https://${h}"]
  protect   = local.is_main && var.protect_data
}

data "aws_caller_identity" "current" {}

data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

module "certificate" {
  source            = "./modules/certificate"
  domain_name       = local.hostnames[0]
  alternative_names = slice(local.hostnames, 1, length(local.hostnames))
  zone_id           = data.aws_route53_zone.main.zone_id
}

module "site" {
  source          = "./modules/static_site"
  name            = local.name
  aliases         = local.hostnames
  certificate_arn = module.certificate.certificate_arn
  force_destroy   = !local.protect
}

module "publish_role" {
  source           = "./modules/publish_role"
  name             = local.name
  account_id       = data.aws_caller_identity.current.account_id
  site_bucket_arn  = "arn:aws:s3:::${module.site.bucket_name}"
  distribution_arn = "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${module.site.distribution_id}"
  state_bucket     = "${replace(var.domain_name, ".", "-")}-tfstate"
}

resource "aws_route53_record" "site" {
  for_each = {
    for pair in setproduct(local.hostnames, ["A", "AAAA"]) :
    "${pair[0]}-${pair[1]}" => { name = pair[0], type = pair[1] }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type

  alias {
    name                   = module.site.distribution_domain_name
    zone_id                = module.site.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}
