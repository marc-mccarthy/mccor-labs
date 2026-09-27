variable "name" {
  description = "Short project name used in resource names"
  type        = string
}

variable "domain_prefix" {
  description = "Globally unique prefix for the hosted sign-in page. Can't contain aws, amazon or cognito."
  type        = string
}

variable "callback_urls" {
  description = "Where Cognito may send users after sign-in. Must match your site exactly, including the trailing slash."
  type        = list(string)
}

variable "logout_urls" {
  description = "Where Cognito may send users after sign-out"
  type        = list(string)
}

variable "allow_self_signup" {
  description = "Let anyone create an account. Set false to invite-only (you create users yourself)."
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Block accidental deletion of the user pool (and every user in it)"
  type        = bool
  default     = true
}
