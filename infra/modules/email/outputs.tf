output "mail_bucket" {
  description = "Bucket holding raw incoming messages"
  value       = aws_s3_bucket.mail.bucket
}

output "addresses" {
  description = "Addresses that accept mail"
  value       = length(var.recipients) > 0 ? [for r in var.recipients : "${r}@${var.domain_name}"] : ["*@${var.domain_name} (catch-all)"]
}

output "forwards_to" {
  value = var.forward_to
}

output "mail_from" {
  description = "Address the forwarder sends as"
  value       = "${var.mail_from_local}@${var.domain_name}"
}
