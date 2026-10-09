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

  validation {
    condition     = endswith(var.contact_from, "@${element(split("/", var.ses_identity_arn), 1)}")
    error_message = "contact_from must end with @ followed by the domain of ses_identity_arn."
  }
}

variable "contact_to" {
  description = "Owner address that receives contact form messages"
  type        = string
}

variable "contact_daily_cap" {
  description = "Contact messages accepted per UTC day before the form returns daily_cap"
  type        = number
  default     = 50

  validation {
    condition     = var.contact_daily_cap >= 1 && floor(var.contact_daily_cap) == var.contact_daily_cap
    error_message = "contact_daily_cap must be a whole number of at least 1."
  }
}

variable "lab_model_id" {
  description = "Inference profile ID the lab Lambda calls through Converse"
  type        = string
  default     = "us.amazon.nova-2-lite-v1:0"
}

variable "lab_foundation_model_id" {
  description = "Foundation model ID behind the inference profile"
  type        = string
  default     = "amazon.nova-2-lite-v1:0"
}

variable "lab_profile_regions" {
  description = "Regions the inference profile routes to, one foundation-model ARN each"
  type        = list(string)
  default     = ["us-east-1", "us-east-2", "us-west-2"]
}

variable "alert_email" {
  description = "Address the spend brake notifies when it fires"
  type        = string
}

variable "brake_usd" {
  description = "Monthly account spend in USD at which the brake denies Bedrock to the lab role"
  type        = number
  default     = 22

  validation {
    condition     = var.brake_usd > 0
    error_message = "brake_usd must be greater than 0."
  }
}
