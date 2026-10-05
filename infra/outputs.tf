output "site_url" {
  value = local.site_urls[0]
}

/*
output "api_url" {
  value = module.api.api_url
}

output "sign_in_url" {
  value = module.auth.hosted_ui_base_url
}

output "user_pool_id" {
  value = module.auth.user_pool_id
}
*/

output "site_bucket" {
  value = module.site.bucket_name
}

output "cloudfront_distribution_id" {
  value = module.site.distribution_id
}

output "publish_role_arn" {
  description = "Role that the publish profile in ~/.config/aws/config assumes for ./infra/deploy.sh publish"
  value       = module.publish_role.role_arn
}
