variable "domain_name" {
  description = "Domain that receives mail, e.g. example.com"
  type        = string
}

variable "zone_id" {
  description = "Route 53 zone for domain_name"
  type        = string
}

variable "forward_to" {
  description = "Inbox that every address forwards to, e.g. you@gmail.com"
  type        = string
}

variable "recipients" {
  description = "Local parts that accept mail. Anything else is rejected. Use [] to accept the whole domain (catch-all)."
  type        = list(string)
  default     = ["hello", "support"]
}

variable "mail_from_local" {
  description = "Local part the forwarder sends as. SES can only send as your own domain, so the original sender goes in Reply-To."
  type        = string
  default     = "noreply"
}

variable "retain_days" {
  description = "How long raw messages stay in S3 before deletion"
  type        = number
  default     = 30
}

variable "log_retention_days" {
  type    = number
  default = 14
}

variable "force_destroy" {
  description = "Allow deleting the mail bucket while it still holds messages"
  type        = bool
  default     = false
}
