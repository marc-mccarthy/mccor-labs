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
  description = "Mailbox local part => person's name, for reference only. marcm = \"Marc M\" creates marcm@<domain_name>. The name senders show is set in each mail client."
  type        = map(string)

  validation {
    condition     = alltrue([for k in keys(var.mailboxes) : can(regex("^[a-z0-9][a-z0-9._-]{0,63}$", k))])
    error_message = "Mailbox names must be lowercase letters, numbers, dot, dash or underscore."
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
