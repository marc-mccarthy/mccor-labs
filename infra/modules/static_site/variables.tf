variable "name" {
  description = "Short project name used in resource names (lowercase letters, numbers, dashes)"
  type        = string
}

variable "aliases" {
  description = "Domains CloudFront should answer for, e.g. [\"example.com\", \"www.example.com\"]. Empty serves the CloudFront default domain."
  type        = list(string)
  default     = []
}

variable "certificate_arn" {
  description = "Validated ACM certificate (us-east-1) covering every alias. Null uses the CloudFront default certificate."
  type        = string
  default     = null
}

variable "force_destroy" {
  description = "Allow terraform destroy to delete the bucket even if it still has files"
  type        = bool
  default     = false
}
