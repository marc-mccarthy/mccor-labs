output "site_url" {
  value = local.site_urls[0]
}

output "site_bucket" {
  value = module.site.bucket_name
}

output "cloudfront_distribution_id" {
  value = module.site.distribution_id
}

output "publish_role_arn" {
  description = "Publish role, not used yet; ./infra/deploy.sh publish uses the 1Password AWS keys"
  value       = module.publish_role.role_arn
}
