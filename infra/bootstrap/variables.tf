variable "name" {
  description = "Project name prefix for the state bucket, role and budget"
  type        = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.name)) && length(var.name) <= 32
    error_message = "name must be lowercase alphanumeric with hyphens, 32 chars max."
  }
}
variable "domain_name" {
  description = "Domain registered in Route 53 once transferred"
  type        = string
}
variable "alert_email" {
  description = "Email that receives budget alerts"
  type        = string
}
variable "monthly_budget_usd" {
  description = "Monthly cost budget that triggers the alert email"
  type        = number
  default     = 5
}
variable "enable_budget" {
  description = "Create the monthly budget; false while another stack still owns one with the same name"
  type        = bool
  default     = true
}
variable "github_subject_prefix" {
  description = "OIDC subject prefix, repo:<owner>@<owner_id>/<repo>@<repo_id>"
  type        = string
  validation {
    condition     = can(regex("^repo:[^/]+@[0-9]+/[^/]+@[0-9]+$", var.github_subject_prefix))
    error_message = "github_subject_prefix must look like repo:<owner>@<owner_id>/<repo>@<repo_id>."
  }
}
variable "domain_registrar_is_route53" {
  description = "True only after the domain transfer to Route 53 has completed"
  type        = bool
  default     = false
}
variable "domain_contact" {
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
    condition     = !var.domain_registrar_is_route53 || (var.domain_contact != null && can(regex("^\\+[0-9]+\\.[0-9]+$", try(var.domain_contact.phone_number, ""))))
    error_message = "domain_contact is required, with phone_number as +<country>.<number>, when domain_registrar_is_route53 is true."
  }
}
