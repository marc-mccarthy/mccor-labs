output "state_bucket" {
  description = "Name of the Terraform state bucket"
  value       = aws_s3_bucket.state.bucket
}

output "delegation_set_id" {
  description = "Put this in 1Password as delegation_set_id for the main stack"
  value       = aws_route53_delegation_set.main.id
}

output "name_servers" {
  description = "Fixed name servers for the registrar and the domain transfer request"
  value       = aws_route53_delegation_set.main.name_servers
}

output "terraform_role_arn" {
  description = "Role the CI terraform job assumes"
  value       = aws_iam_role.terraform.arn
}
