output "server_name" {
  description = "Name clients connect to for IMAP and sending"
  value       = local.fqdn
}

output "public_ip" {
  description = "Fixed address of the server. Give this to AWS if you ever request a reverse-DNS record."
  value       = aws_eip.mail.public_ip
}

output "addresses" {
  description = "Every mailbox that exists"
  value       = sort(values(local.addresses))
}

output "client_settings" {
  description = "What to type into Apple Mail, Outlook, Thunderbird or the Gmail app"
  value = {
    imap_server = local.fqdn
    imap_port   = 993
    imap_tls    = "SSL/TLS"
    smtp_server = local.fqdn
    smtp_port   = 587
    smtp_tls    = "STARTTLS"
    username    = "the full email address"
  }
}

# terraform output -json mailbox_passwords
output "passwords" {
  description = "First-login password per mailbox"
  value       = { for k, p in random_password.mailbox : k => p.result }
  sensitive   = true
}

output "instance_id" {
  description = "For shell access: aws ssm start-session --target <this>"
  value       = aws_instance.mail.id
}

output "snapshot_tag" {
  description = "Tag the backup snapshots carry, for finding them during a restore"
  value       = local.snapshot_tag
}

output "alerts_topic_arn" {
  description = "SNS topic every CloudWatch alarm publishes to"
  value       = aws_sns_topic.alerts.arn
}
