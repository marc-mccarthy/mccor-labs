variable "name" {
  description = "Short project name used in resource names"
  type        = string
}

variable "package_dir" {
  description = "Directory holding the built handler zips, e.g. app/api/dist"
  type        = string
}

variable "ses_identity_arn" {
  description = "ARN of the verified SES domain identity the contact email is sent from"
  type        = string
}

variable "contact_from" {
  description = "From address of the contact email, inside the SES identity's domain"
  type        = string
}

variable "contact_to" {
  description = "Owner address that receives contact form messages"
  type        = string
}

variable "contact_daily_cap" {
  description = "Contact messages accepted per UTC day before the form returns daily_cap"
  type        = number
  default     = 50
}
