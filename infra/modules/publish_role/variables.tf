variable "name" {
  description = "Environment name; the role is called <name>-publish"
  type        = string
}

variable "account_id" {
  description = "AWS account whose root principal may assume the role"
  type        = string
}

variable "site_bucket_arn" {
  description = "ARN of the S3 bucket that holds the website files"
  type        = string
}

variable "distribution_arn" {
  description = "ARN of the CloudFront distribution the role may invalidate"
  type        = string
}

variable "state_bucket" {
  description = "Name of the Terraform state bucket"
  type        = string
}
