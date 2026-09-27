output "user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "issuer_url" {
  description = "Token issuer, used by the API to verify logins"
  value       = "https://${aws_cognito_user_pool.this.endpoint}"
}

output "hosted_ui_base_url" {
  description = "Base URL of the hosted sign-in pages"
  value       = "https://${aws_cognito_user_pool_domain.this.domain}.auth.${data.aws_region.current.region}.amazoncognito.com"
}
