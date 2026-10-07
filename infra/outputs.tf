output "region" {
  value = data.aws_region.current.region
}

output "site_url" {
  value = local.site_url
}

output "site_bucket" {
  value = module.site.bucket_name
}

output "cloudfront_distribution_id" {
  value = module.site.distribution_id
}

output "deploy_role_arn" {
  value = aws_iam_role.deploy.arn
}

output "name_servers" {
  description = "The delegation set name servers, fixed for the life of the bootstrap stack"
  value       = one(aws_route53_zone.this[*].name_servers)
}

output "mail_server" {
  description = "Name your mail clients connect to"
  value       = one(module.mailserver[*].server_name)
}

output "mail_addresses" {
  value = one(module.mailserver[*].addresses)
}

output "mail_client_settings" {
  description = "Settings for Apple Mail, Outlook, Thunderbird or the Gmail app"
  value       = one(module.mailserver[*].client_settings)
}

output "mail_server_ip" {
  description = "Fixed address of the server"
  value       = one(module.mailserver[*].public_ip)
}

output "mail_instance_id" {
  description = "Shell access: aws ssm start-session --target <this>"
  value       = one(module.mailserver[*].instance_id)
}

output "alerts_topic_arn" {
  description = "SNS topic the alarms publish to. The email subscription must be confirmed before anything alerts."
  value       = one(module.mailserver[*].alerts_topic_arn)
}

output "mailbox_passwords" {
  description = "First-login password per mailbox"
  value       = one(module.mailserver[*].passwords)
  sensitive   = true
}
