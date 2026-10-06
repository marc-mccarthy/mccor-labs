output "region" {
  value = data.aws_region.current.region
}

output "site_url" {
  value = local.site_urls[0]
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
  description = "Enter these four in Namecheap as Custom DNS"
  value       = aws_route53_zone.this.name_servers
}

output "mail_server" {
  description = "Name your mail clients connect to"
  value       = module.mailserver.server_name
}

output "mail_addresses" {
  value = module.mailserver.addresses
}

output "mail_client_settings" {
  description = "Settings for Apple Mail, Outlook, Thunderbird or the Gmail app"
  value       = module.mailserver.client_settings
}

output "mail_server_ip" {
  description = "Fixed address of the server"
  value       = module.mailserver.public_ip
}

output "mail_instance_id" {
  description = "Shell access: aws ssm start-session --target <this>"
  value       = module.mailserver.instance_id
}

output "alerts_topic_arn" {
  description = "SNS topic the alarms publish to. The email subscription must be confirmed before anything alerts."
  value       = module.mailserver.alerts_topic_arn
}

output "mailbox_passwords" {
  description = "First-login password per mailbox"
  value       = module.mailserver.passwords
  sensitive   = true
}
