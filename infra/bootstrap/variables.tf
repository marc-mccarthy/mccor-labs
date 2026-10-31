variable "NAME" {
  description = "Project name prefix for the state bucket, role and budget"
  type        = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.NAME)) && length(var.NAME) <= 32
    error_message = "name must be lowercase alphanumeric with hyphens, 32 chars max."
  }
}
variable "PROJECT" {
  description = "Project tag on every resource, for cost allocation"
  type        = string
  default     = "mccor-labs"
}
variable "ENV" {
  description = "Env tag on every resource, for cost allocation"
  type        = string
  default     = "prod"
}
variable "DOMAIN_NAME" {
  description = "Domain registered in Route 53 once transferred"
  type        = string
}
variable "ALERT_EMAIL" {
  description = "Email that receives budget alerts"
  type        = string
}
variable "MONTHLY_BUDGET_USD" {
  description = "Monthly cost budget that triggers the alert email"
  type        = number
  default     = 5
}
variable "ENABLE_BUDGET" {
  description = "Create the monthly budget; false while another stack still owns one with the same name"
  type        = bool
  default     = true
}
variable "GITHUB_SUBJECT_PREFIX" {
  description = "OIDC subject prefix, repo:<owner>@<owner_id>/<repo>@<repo_id>"
  type        = string
  validation {
    condition     = can(regex("^repo:[^/]+@[0-9]+/[^/]+@[0-9]+$", var.GITHUB_SUBJECT_PREFIX))
    error_message = "github_subject_prefix must look like repo:<owner>@<owner_id>/<repo>@<repo_id>."
  }
}
variable "DOMAIN_REGISTRAR_IS_ROUTE53" {
  description = "True only after the domain transfer to Route 53 has completed"
  type        = bool
  default     = false
}
variable "DOMAIN_CONTACT" {
  description = "Registrant contact for the registered domain; must match what the transfer used"
  type = object({
    contact_type      = string
    organization_name = optional(string)
    first_name        = string
    last_name         = string
    email             = string
    phone_number      = string
    address_line_1    = string
    address_line_2    = optional(string)
    city              = string
    state             = string
    zip_code          = string
    country_code      = string
  })
  default = null
  validation {
    condition     = !var.DOMAIN_REGISTRAR_IS_ROUTE53 || (var.DOMAIN_CONTACT != null && can(regex("^\\+[0-9]+\\.[0-9]+$", try(var.DOMAIN_CONTACT.phone_number, ""))))
    error_message = "domain_contact is required, with phone_number as +<country>.<number>, when domain_registrar_is_route53 is true."
  }
}
