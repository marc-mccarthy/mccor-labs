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

output "lab_profile_arn" {
  description = "ARN of the Nova inference profile the lab and the eval role invoke"
  value       = local.lab_profile_arn
}

output "lab_model_arns" {
  description = "Foundation-model ARNs behind the inference profile, one per profile region"
  value       = local.lab_model_arns
}

output "brake_role_names" {
  description = "Names of the roles the spend brake attaches its deny policy to"
  value       = toset([for role in values(local.brake_roles) : role.name])
}
