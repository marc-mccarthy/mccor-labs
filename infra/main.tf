# One configuration, many copies:
#   ENV_ID empty  -> the main site at example.com and www.example.com
#   ENV_ID=mm     -> a personal copy at mm.example.com
# deploy.sh picks a Terraform workspace named after ENV_ID, so every copy has
# its own state and its own resources.

locals {
  env_id  = terraform.workspace == "default" ? "" : terraform.workspace
  is_main = local.env_id == ""
  name    = local.is_main ? var.project : "${var.project}-${local.env_id}"

  hostnames = local.is_main ? [var.domain_name, "www.${var.domain_name}"] : ["${local.env_id}.${var.domain_name}"]
  site_urls = [for h in local.hostnames : "https://${h}"]

  # Personal copies are always easy to delete. The main site is protected.
  protect = local.is_main && var.protect_data

  web_dir = "${path.root}/../app/web"
}

data "aws_caller_identity" "current" {}

# Created once by ./deploy.sh setup.
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# ---------- HTTPS certificate ----------

module "certificate" {
  source            = "./modules/certificate"
  domain_name       = local.hostnames[0]
  alternative_names = slice(local.hostnames, 1, length(local.hostnames))
  zone_id           = data.aws_route53_zone.main.zone_id
}

# ---------- Website (S3 + CloudFront) ----------

module "site" {
  source          = "./modules/static_site"
  name            = local.name
  aliases         = local.hostnames
  certificate_arn = module.certificate.certificate_arn
  force_destroy   = !local.protect
}

# Point each hostname at CloudFront. Alias records (IPv4 + IPv6) are Route 53's
# free way to point at AWS resources.
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

# ---------- Logins (Cognito) ----------

module "auth" {
  source = "./modules/auth"
  name   = local.name

  # Must be globally unique. A short hash of your account ID keeps it unique
  # without putting the account ID itself in the URL.
  domain_prefix = "${local.name}-${substr(sha1(data.aws_caller_identity.current.account_id), 0, 6)}"

  callback_urls       = [for u in local.site_urls : "${u}/"]
  logout_urls         = [for u in local.site_urls : "${u}/"]
  deletion_protection = local.protect
}

# ---------- Database (DynamoDB) ----------

module "database" {
  source              = "./modules/database"
  name                = "${local.name}-data"
  deletion_protection = local.protect

  # The always-free tier covers 25 read + 25 write units across the account.
  # Personal copies take 1 each so they never eat into the main site's share.
  read_capacity  = local.is_main ? 5 : 1
  write_capacity = local.is_main ? 5 : 1
}

# ---------- API (API Gateway + Lambda) ----------

module "api" {
  source          = "./modules/api"
  name            = local.name
  source_dir      = "${path.root}/../app/api"
  table_name      = module.database.table_name
  table_arn       = module.database.table_arn
  jwt_issuer      = module.auth.issuer_url
  jwt_audience    = [module.auth.client_id]
  allowed_origins = local.site_urls
}

# ---------- Upload the web app ----------

# config.js is generated from Terraform outputs so the frontend never has
# hard-coded IDs or URLs. Each environment gets its own.
resource "aws_s3_object" "config" {
  bucket        = module.site.bucket_name
  key           = "config.js"
  content_type  = "application/javascript"
  cache_control = "no-cache"
  content = "window.APP_CONFIG = ${jsonencode({
    authDomain = module.auth.hosted_ui_base_url
    clientId   = module.auth.client_id
    apiUrl     = module.api.api_url
  })};\n"
}

# Fine for the starter page. Once you have a real build step, upload with
# `aws s3 sync` instead (see README).
resource "aws_s3_object" "web" {
  for_each = {
    "index.html" = "text/html; charset=utf-8"
    "app.js"     = "application/javascript"
  }

  bucket        = module.site.bucket_name
  key           = each.key
  source        = "${local.web_dir}/${each.key}"
  etag          = filemd5("${local.web_dir}/${each.key}")
  content_type  = each.value
  cache_control = "no-cache"
}
