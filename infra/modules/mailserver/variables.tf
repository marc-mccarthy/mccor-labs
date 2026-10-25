variable "name" {
  description = "Short project name used in resource names (lowercase letters, numbers, dashes)"
  type        = string
}

variable "domain_name" {
  description = "Mail domain, e.g. example.com"
  type        = string
}

variable "zone_id" {
  description = "Route 53 zone for domain_name"
  type        = string
}

variable "hostname" {
  description = "Public name of the server itself. Becomes the MX target and the name on its TLS certificate."
  type        = string
  default     = "mail"
}

variable "mailboxes" {
  description = "Mailbox local part => sender display name. marcm = \"Marc McCarthy\" creates marcm@<domain_name>, and the server stamps that name on everything it sends from that address, whatever the mail app."
  type        = map(string)

  validation {
    condition     = alltrue([for k in keys(var.mailboxes) : can(regex("^[a-z0-9][a-z0-9._-]{0,63}$", k))])
    error_message = "Mailbox names must be lowercase letters, numbers, dot, dash or underscore."
  }

  validation {
    condition     = alltrue([for v in values(var.mailboxes) : can(regex("^[A-Za-z][A-Za-z .'-]{0,63}$", v))])
    error_message = "Display names must start with a letter and use only letters, spaces, dot, apostrophe or dash, up to 64 characters."
  }
}

variable "admin_mailbox" {
  description = "Mailbox that receives postmaster@, abuse@ and DMARC reports"
  type        = string
}

variable "instance_type" {
  description = "t4g.small is the smallest size that runs the mail stack and its spam filter comfortably."
  type        = string
  default     = "t4g.small"
}

variable "mail_volume_gb" {
  description = "Size of the separate disk holding mail. Kept off the root disk so rebuilding the server never touches mail."
  type        = number
  default     = 20
}

variable "alert_email" {
  description = "Where Let's Encrypt sends certificate-expiry warnings"
  type        = string
}
