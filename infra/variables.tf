# Values come from settings.auto.tfvars.

variable "project" {
  description = "Short name used in every resource name"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,18}[a-z0-9]$", var.project)) && !can(regex("aws|amazon|cognito", var.project))
    error_message = "Use 3-20 lowercase letters, numbers or dashes, starting with a letter. Can't contain aws, amazon or cognito."
  }
}

variable "domain_name" {
  description = "Your domain, e.g. example.com"
  type        = string
}

variable "alert_email" {
  description = "Used by setup (budget alert)"
  type        = string
}

variable "monthly_budget_usd" {
  description = "Used by setup (budget alert)"
  type        = number
  default     = 5
}

variable "protect_data" {
  description = "Deletion safeguards on the main site's users, data and files. deploy.sh turns this off only when you destroy the main site."
  type        = bool
  default     = true
}

# ---------- Declared here only to keep Terraform quiet ----------

# These live in settings.auto.tfvars, which this root loads automatically, but
# they are consumed by infra/setup rather than here. Without these blocks every
# command in this directory prints "Value for undeclared variable".

variable "enable_mailserver" {
  description = "Used by infra/setup. Ignored here."
  type        = bool
  default     = false
}

variable "enable_email" {
  description = "Used by infra/setup. Ignored here."
  type        = bool
  default     = false
}

variable "mailboxes" {
  description = "Used by infra/setup. Ignored here."
  type        = map(string)
  default     = {}
}

variable "admin_mailbox" {
  description = "Used by infra/setup. Ignored here."
  type        = string
  default     = ""
}

variable "mail_forward_to" {
  description = "Used by infra/setup. Ignored here."
  type        = string
  default     = null
}

variable "mail_recipients" {
  description = "Used by infra/setup. Ignored here."
  type        = list(string)
  default     = []
}
