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

variable "api_origins" {
  description = "Lambda Function URL origins served under the site domain, one per path pattern"
  type = list(object({
    path_pattern        = string
    function_url_domain = string
  }))
  default = []
}

variable "api_function_arns" {
  description = "Function ARN per endpoint name that CloudFront may invoke through its Function URL"
  type        = map(string)
  default     = {}
}
