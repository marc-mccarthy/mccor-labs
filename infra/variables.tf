variable "name" {
  description = "Short name used in every resource name"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.name)) && length(var.name) <= 32
    error_message = "name must be lowercase alphanumeric with hyphens, 32 chars max."
  }
}

variable "domain_name" {
  description = "Your domain, e.g. example.com. An explicit empty string deploys only what works on the CloudFront default domain."
  type        = string

  validation {
    condition     = var.domain_name == "" || can(regex("^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$", var.domain_name))
    error_message = "domain_name must be empty or a lowercase domain such as example.com."
  }
}

variable "delegation_set_id" {
  description = "Reusable delegation set from infra/bootstrap. Required when domain_name is set."
  type        = string
  default     = ""

  validation {
    condition     = var.domain_name == "" || length(var.delegation_set_id) > 0
    error_message = "delegation_set_id is blank. Fill in its field in the 1Password item that app.env points at."
  }
}

variable "alert_email" {
  description = "Budget alerts, certificate-expiry warnings and alarm notifications"
  type        = string

  validation {
    condition     = length(var.alert_email) > 0
    error_message = "alert_email is blank. Fill in its field in the 1Password item that app.env points at."
  }
}

variable "protect_data" {
  description = "Deletion safeguards on the site files. Set false only before deliberately destroying the site."
  type        = bool
  default     = true
}

variable "mailboxes" {
  description = "Mailbox local part => display name. marcm = \"Marc M\" creates marcm@<domain_name>."
  type        = map(string)

  validation {
    condition     = length(var.mailboxes) > 0
    error_message = "mailboxes is empty. A mail server with no mailboxes accepts mail it cannot deliver."
  }
}

variable "admin_mailbox" {
  description = "Which mailbox receives postmaster@, abuse@ and DMARC reports. Must be a key in mailboxes."
  type        = string

  validation {
    condition     = contains(keys(var.mailboxes), var.admin_mailbox)
    error_message = "admin_mailbox must name one of the mailboxes. Left to chance it falls to whoever sorts first alphabetically, and moves when you hire someone."
  }
}

variable "instance_type" {
  description = "EC2 instance type for the mail server. t4g.small (2GB) is the smallest size that runs the mail stack and its spam filter safely -- it matches docker-mailserver's own recommended figure. t4g.micro (1GB) is below that floor and risks the kernel OOM-killing Rspamd, which fails open and stops filtering silently; do not use it to save money. Changing this resizes in place rather than rebuilding, but the instance stops and starts, so mail is deferred for a few minutes."
  type        = string
  default     = "t4g.small"
}

variable "mail_volume_gb" {
  description = "Size in GB of the separate EBS volume holding mail, kept off the root disk so rebuilding the server never touches mail. Terraform only grows the volume -- it never shrinks it. After apply, the box itself still needs `resize2fs` run on the mail filesystem before the extra space is usable."
  type        = number
  default     = 20
}

variable "github_subject_prefix" {
  description = "GitHub OIDC subject prefix, repo:<owner>@<owner_id>/<repo>@<repo_id>"
  type        = string

  validation {
    condition     = can(regex("^repo:[^/]+@[0-9]+/[^/]+@[0-9]+$", var.github_subject_prefix))
    error_message = "github_subject_prefix must look like repo:<owner>@<owner_id>/<repo>@<repo_id>."
  }
}
