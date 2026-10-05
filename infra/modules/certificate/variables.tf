variable "domain_name" {
  description = "Main domain for the certificate, e.g. example.com"
  type        = string
}

variable "alternative_names" {
  description = "Extra names on the same certificate, e.g. [\"www.example.com\"]"
  type        = list(string)
  default     = []
}

variable "zone_id" {
  description = "Route 53 hosted zone ID for the domain"
  type        = string
}
