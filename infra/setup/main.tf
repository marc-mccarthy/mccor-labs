# One-time setup, run with `./deploy.sh setup`. Creates the things every
# environment shares:
#   - the S3 bucket that stores Terraform state
#   - the Route 53 zone for your domain (the only fixed cost: $0.50/month)
#   - a monthly AWS spending alert (free)
#   - ../backend.hcl, which tells the main configuration where its state lives
#
# Reads the same ../settings.auto.tfvars as everything else. Its own state is
# kept on your machine in terraform.tfstate (git-ignored); keep a backup.

terraform {
  required_version = "~> 1.16"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.58"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.9"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.8"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# The backend block lives in its own file, backend.tf -- see the comment
# there for why it can't stay in this one.

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}

variable "project" {
  type = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,18}[a-z0-9]$", var.project)) && !can(regex("aws|amazon|cognito", var.project))
    error_message = "Use 3-20 lowercase letters, numbers or dashes, starting with a letter. Can't contain aws, amazon or cognito."
  }
}

variable "domain_name" {
  type = string

  validation {
    condition     = length(var.domain_name) > 0
    error_message = "domain_name is blank. Copy settings.auto.tfvars.example and fill it in."
  }
}

variable "alert_email" {
  # Use an address on a different provider: an alert about this mail server
  # delivered to this mail server is an alert nobody sees.
  type = string

  validation {
    condition     = length(var.alert_email) > 0
    error_message = "alert_email is blank. Copy settings.auto.tfvars.example and fill it in."
  }
}

variable "monthly_budget_usd" {
  type    = number
  default = 5
}

variable "enable_email" {
  description = "Turn on mail forwarding for the domain. Leave false until your registrar points at this zone's name servers, otherwise SES cannot verify the domain."
  type        = bool
  default     = false
}

variable "mail_forward_to" {
  description = "Inbox every address forwards to. Defaults to alert_email."
  type        = string
  default     = null
}

variable "mail_recipients" {
  description = "Local parts that accept mail. Empty list accepts the whole domain."
  type        = list(string)
  default     = ["hello", "support"]
}

variable "enable_mailserver" {
  description = "Run your own mail server on EC2, holding your own mailboxes. Leave false until your registrar points at this zone's name servers, otherwise the TLS certificate cannot be issued."
  type        = bool
  default     = false

  validation {
    condition     = !(var.enable_mailserver && var.enable_email)
    error_message = "enable_mailserver and enable_email cannot both be true: each needs the domain's MX record. Pick one."
  }
}

variable "mailboxes" {
  description = "Mailbox local part => display name. marcm = \"Marc M\" creates marcm@<domain_name>."
  type        = map(string)
  default     = {}

  validation {
    condition     = !var.enable_mailserver || length(var.mailboxes) > 0
    error_message = "enable_mailserver is true but mailboxes is empty. A mail server with no mailboxes accepts mail it cannot deliver."
  }
}

variable "admin_mailbox" {
  description = "Which mailbox receives postmaster@, abuse@ and DMARC reports. Must be a key in mailboxes."
  type        = string
  default     = ""

  validation {
    condition     = !var.enable_mailserver || contains(keys(var.mailboxes), var.admin_mailbox)
    error_message = "admin_mailbox must name one of the mailboxes. Left to chance it falls to whoever sorts first alphabetically, and moves when you hire someone."
  }
}

variable "force_destroy" {
  description = "Set true only when removing everything for good. While false, Terraform refuses to delete a state bucket or DNS zone that still has contents."
  type        = bool
  default     = false
}

# ---------- Terraform state bucket ----------

# Named from domain_name, which you already own, so the name is globally
# unique without leaking the account id: mccorlabs.com -> mccorlabs-com-tfstate.
locals {
  state_bucket = "${replace(var.domain_name, ".", "-")}-tfstate"
}

resource "aws_s3_bucket" "state" {
  bucket        = local.state_bucket
  force_destroy = var.force_destroy
}

# Versioning lets you recover a previous state file if something goes wrong.
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Delete old state versions after 90 days so storage stays near $0.
resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    id     = "expire-old-state-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# ---------- DNS zone for your domain ----------

# After this is created, put its four name servers into your registrar
# (Namecheap: Domain List > Manage > Nameservers > Custom DNS).
resource "aws_route53_zone" "main" {
  name          = var.domain_name
  comment       = "Managed by Terraform (infra/setup)"
  force_destroy = var.force_destroy

  lifecycle {
    # Recreating this zone gets a brand-new set of four name servers, which
    # means going back into the registrar by hand and waiting for propagation
    # with mail and the website down throughout. The records inside are cheap
    # to rebuild by apply; the delegation is not, and it is the one step here
    # that cannot be automated.
    #
    # Note this aborts the WHOLE destroy, not just itself -- see the teardown
    # section of MAIL.md, which depends on this block existing.
    prevent_destroy = true
  }
}

# ---------- Mail DNS ----------
# Mail records are not written here. Whichever mail option is enabled below
# owns them: modules/mailserver for your own server, modules/email for
# forwarding. Keeping them in one module stops the two from fighting over
# the domain's MX record.

# ---------- Spending alert ----------

# Budget monitoring and email alerts are free. Emails you if this month's
# bill is forecast to pass 80% of the limit, and again if it passes 100%.
resource "aws_budgets_budget" "monthly" {
  name         = "${var.project}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
}

# ---------- Mail forwarding (optional) ----------

module "email" {
  count  = var.enable_email ? 1 : 0
  source = "../modules/email"

  domain_name   = var.domain_name
  zone_id       = aws_route53_zone.main.zone_id
  forward_to    = coalesce(var.mail_forward_to, var.alert_email)
  recipients    = var.mail_recipients
  force_destroy = var.force_destroy
}

# ---------- Your own mail server (optional) ----------

module "mailserver" {
  count  = var.enable_mailserver ? 1 : 0
  source = "../modules/mailserver"

  domain_name   = var.domain_name
  zone_id       = aws_route53_zone.main.zone_id
  mailboxes     = var.mailboxes
  admin_mailbox = var.admin_mailbox
  alert_email   = var.alert_email
}

# ---------- Backend settings for the main configuration ----------

resource "local_file" "backend" {
  filename        = "${path.module}/../backend.hcl"
  file_permission = "0644"
  content         = <<-EOT
    # Written by infra/setup. Commit this file.
    bucket       = "${aws_s3_bucket.state.bucket}"
    key          = "app/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  EOT
}

# ---------- Outputs ----------

output "name_servers" {
  description = "Enter these four in Namecheap as Custom DNS"
  value       = aws_route53_zone.main.name_servers
}

output "state_bucket" {
  value = aws_s3_bucket.state.bucket
}

output "forwarding_addresses" {
  description = "Addresses that forward, once enable_email is true"
  value       = var.enable_email ? module.email[0].addresses : []
}

output "forwards_to" {
  value = var.enable_email ? module.email[0].forwards_to : null
}

output "mail_server" {
  description = "Name your mail clients connect to"
  value       = var.enable_mailserver ? module.mailserver[0].server_name : null
}

output "mail_addresses" {
  value = var.enable_mailserver ? module.mailserver[0].addresses : []
}

output "mail_client_settings" {
  description = "Settings for Apple Mail, Outlook, Thunderbird or the Gmail app"
  value       = var.enable_mailserver ? module.mailserver[0].client_settings : null
}

output "mail_server_ip" {
  description = "Fixed address of the server"
  value       = var.enable_mailserver ? module.mailserver[0].public_ip : null
}

output "mail_instance_id" {
  description = "Shell access: aws ssm start-session --target <this>"
  value       = var.enable_mailserver ? module.mailserver[0].instance_id : null
}

output "alerts_topic_arn" {
  description = "SNS topic the alarms publish to. The email subscription must be confirmed before anything alerts."
  value       = var.enable_mailserver ? module.mailserver[0].alerts_topic_arn : null
}

# terraform output -json mailbox_passwords
output "mailbox_passwords" {
  description = "First-login password per mailbox"
  value       = var.enable_mailserver ? module.mailserver[0].passwords : null
  sensitive   = true
}
