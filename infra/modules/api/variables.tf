variable "name" {
  description = "Short project name used in resource names"
  type        = string
}

variable "source_dir" {
  description = "Folder containing the Lambda code (index.mjs)"
  type        = string
}

variable "table_name" {
  type = string
}

variable "table_arn" {
  type = string
}

variable "jwt_issuer" {
  description = "Cognito issuer URL"
  type        = string
}

variable "jwt_audience" {
  description = "Cognito app client IDs allowed to call the API"
  type        = list(string)
}

variable "allowed_origins" {
  description = "Website origins allowed to call the API from a browser, e.g. [\"https://example.com\"]"
  type        = list(string)
}

variable "routes" {
  description = "Routes that go to the Lambda function. Every route requires a signed-in user."
  type        = list(string)
  default     = ["GET /items", "POST /items", "DELETE /items/{id}"]
}

variable "memory_size" {
  description = "Lambda memory in MB"
  type        = number
  default     = 256
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "throttle_burst" {
  description = "Max requests allowed in a burst"
  type        = number
  default     = 20
}

variable "throttle_rate" {
  description = "Steady-state requests per second"
  type        = number
  default     = 10
}
