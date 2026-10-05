output "role_arn" {
  description = "ARN of the publish role, for role_arn in the publish AWS profile"
  value       = aws_iam_role.publish.arn
}
