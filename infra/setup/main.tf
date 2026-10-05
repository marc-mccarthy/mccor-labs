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
    error_message = "domain_name is blank. Fill in its field in the 1Password item that infra/terraform.env points at."
  }
}

variable "alert_email" {
  type = string

  validation {
    condition     = length(var.alert_email) > 0
    error_message = "alert_email is blank. Fill in its field in the 1Password item that infra/terraform.env points at."
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

variable "instance_type" {
  description = "EC2 instance type for the mail server. t4g.small (2GB) is the smallest size that runs the mail stack and its spam filter safely -- it matches docker-mailserver's own recommended figure. t4g.micro (1GB) is below that floor and risks the kernel OOM-killing Rspamd, which fails open and stops filtering silently; do not use it to save money. Changing this resizes in place rather than rebuilding, but the instance stops and starts, so mail is deferred for a few minutes."
  type        = string
  default     = "t4g.small"
}

variable "mail_volume_gb" {
  description = "Size in GB of the separate EBS volume holding mail, kept off the root disk so rebuilding the server never touches mail. Terraform only grows the volume -- it never shrinks it. After apply, the box itself still needs `resize2fs` run on the mail filesystem before the extra space is usable; see MAIL.md."
  type        = number
  default     = 20
}

variable "force_destroy" {
  description = "Set true only when removing everything for good. While false, Terraform refuses to delete a state bucket or DNS zone that still has contents."
  type        = bool
  default     = false
}

locals {
  state_bucket = "${replace(var.domain_name, ".", "-")}-tfstate"
}

check "state_bucket_matches_backend" {
  assert {
    condition     = local.state_bucket == "mccorlabs-com-tfstate"
    error_message = "local.state_bucket (${local.state_bucket}) no longer matches the literal bucket name hardcoded in backend.tf (mccorlabs-com-tfstate). Update backend.tf to match, then migrate setup's state to the new bucket name."
  }
}

resource "aws_s3_bucket" "state" {
  bucket        = local.state_bucket
  force_destroy = var.force_destroy
}

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

resource "aws_route53_zone" "main" {
  name          = var.domain_name
  comment       = "Managed by Terraform (infra/setup)"
  force_destroy = var.force_destroy

  lifecycle {
    prevent_destroy = true
  }
}

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

module "email" {
  count  = var.enable_email ? 1 : 0
  source = "../modules/email"

  domain_name   = var.domain_name
  zone_id       = aws_route53_zone.main.zone_id
  forward_to    = coalesce(var.mail_forward_to, var.alert_email)
  recipients    = var.mail_recipients
  force_destroy = var.force_destroy
}

module "mailserver" {
  count  = var.enable_mailserver ? 1 : 0
  source = "../modules/mailserver"

  domain_name    = var.domain_name
  zone_id        = aws_route53_zone.main.zone_id
  mailboxes      = var.mailboxes
  admin_mailbox  = var.admin_mailbox
  alert_email    = var.alert_email
  instance_type  = var.instance_type
  mail_volume_gb = var.mail_volume_gb
}

resource "local_file" "backend" {
  filename        = "${path.module}/../backend.hcl"
  file_permission = "0644"
  content         = <<-EOT
    bucket       = "${aws_s3_bucket.state.bucket}"
    key          = "app/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  EOT
}

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

output "mailbox_passwords" {
  description = "First-login password per mailbox"
  value       = var.enable_mailserver ? module.mailserver[0].passwords : null
  sensitive   = true
}
