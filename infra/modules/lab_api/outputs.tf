output "api_origins" {
  description = "Path pattern and Function URL host per endpoint, for the CloudFront distribution"
  value = [{
    path_pattern        = "/api/contact"
    function_url_domain = split("/", aws_lambda_function_url.contact.function_url)[2]
  }]
}

output "function_arns" {
  description = "Function ARN per endpoint name, for the CloudFront invoke permissions"
  value       = { contact = aws_lambda_function.contact.arn }
}
