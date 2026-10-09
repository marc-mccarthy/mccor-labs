output "api_origins" {
  description = "Path pattern and Function URL host per endpoint, for the CloudFront distribution"
  value = [
    {
      path_pattern        = "/api/contact"
      function_url_domain = split("/", aws_lambda_function_url.contact.function_url)[2]
    },
    {
      path_pattern        = "/api/feedback"
      function_url_domain = split("/", aws_lambda_function_url.feedback.function_url)[2]
    },
  ]
}

output "function_arns" {
  description = "Function ARN per endpoint name, for the CloudFront invoke permissions"
  value = {
    contact  = aws_lambda_function.contact.arn
    feedback = aws_lambda_function.feedback.arn
  }
}

output "lab_guardrail_arn" {
  description = "ARN of the lab Bedrock guardrail"
  value       = aws_bedrock_guardrail.lab.guardrail_arn
}

output "lab_guardrail_id" {
  description = "ID of the lab Bedrock guardrail"
  value       = aws_bedrock_guardrail.lab.guardrail_id
}

output "lab_guardrail_version" {
  description = "Published version of the lab Bedrock guardrail that the handler calls"
  value       = aws_bedrock_guardrail_version.lab.version
}
