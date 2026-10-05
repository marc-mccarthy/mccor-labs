output "api_url" {
  description = "Base URL of the API, e.g. https://abc123.execute-api.us-east-1.amazonaws.com"
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "function_name" {
  value = aws_lambda_function.fn.function_name
}
