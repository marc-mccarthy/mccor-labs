# Addresses on your domain that forward to an inbox you already have.
#
# Mail flows: sender -> MX -> SES inbound -> S3 (raw message) -> Lambda,
# which rewrites the headers and re-sends the message to var.forward_to.
# There are no mailboxes here, so there is no per-user monthly cost.
#
# SES can only send as a domain it has verified, so the forwarded copy comes
# from <mail_from_local>@<domain> with the original sender in Reply-To. Hit
# reply and it goes to the right person.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  # Same pattern as the state bucket: derived from the domain you own.
  bucket    = "${replace(var.domain_name, ".", "-")}-mail"
  mail_from = "${var.mail_from_local}@${var.domain_name}"

  # An empty recipients list means "accept anything at this domain".
  rule_recipients = length(var.recipients) > 0 ? [for r in var.recipients : "${r}@${var.domain_name}"] : [var.domain_name]
}

# ---------- Prove the domain is yours ----------

resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# Three CNAMEs that let receiving servers check the signature on outgoing mail.
resource "aws_route53_record" "dkim" {
  count = 3

  zone_id = var.zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# No aws_ses_domain_identity_verification here on purpose: it blocks the apply
# for up to 45 minutes waiting on DNS, and fails outright if your registrar is
# not yet pointing at this zone. Verification completes by itself once the
# records above resolve. Check it with:
#   aws ses get-identity-verification-attributes --identities example.com

# ---------- DNS that points mail at SES ----------

# Tells the world to deliver mail for this domain to SES.
resource "aws_route53_record" "mx" {
  zone_id = var.zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = 600
  records = ["10 inbound-smtp.${data.aws_region.current.region}.amazonaws.com"]
}

# Says SES is allowed to send on this domain's behalf.
resource "aws_route53_record" "spf" {
  zone_id = var.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

# Tells receivers what to do with mail that fails the checks above.
# "none" only reports; tighten to quarantine or reject once you trust it.
resource "aws_route53_record" "dmarc" {
  zone_id = var.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=DMARC1; p=none; rua=mailto:${var.forward_to}"]
}

# ---------- Where raw messages land ----------

resource "aws_s3_bucket" "mail" {
  bucket        = local.bucket
  force_destroy = var.force_destroy
}

resource "aws_s3_bucket_public_access_block" "mail" {
  bucket                  = aws_s3_bucket.mail.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Messages are forwarded within seconds, so the copy here is only a safety net.
resource "aws_s3_bucket_lifecycle_configuration" "mail" {
  bucket = aws_s3_bucket.mail.id

  rule {
    id     = "expire"
    status = "Enabled"

    filter {}

    expiration {
      days = var.retain_days
    }
  }
}

# Lets SES write into the bucket, but only for this account.
data "aws_iam_policy_document" "bucket" {
  statement {
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.mail.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["ses.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_s3_bucket_policy" "mail" {
  bucket = aws_s3_bucket.mail.id
  policy = data.aws_iam_policy_document.bucket.json
}

# ---------- The forwarder ----------

data "archive_file" "code" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/.build/mail-forwarder.zip"
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "fn" {
  name_prefix        = "mail-forwarder-"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.fn.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Read the stored message, and send one as this domain. Nothing else.
data "aws_iam_policy_document" "fn" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.mail.arn}/*"]
  }

  statement {
    actions   = ["ses:SendRawEmail"]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "ses:FromAddress"
      values   = [local.mail_from]
    }
  }
}

resource "aws_iam_role_policy" "fn" {
  name   = "forward-mail"
  role   = aws_iam_role.fn.id
  policy = data.aws_iam_policy_document.fn.json
}

resource "aws_cloudwatch_log_group" "fn" {
  name              = "/aws/lambda/${replace(var.domain_name, ".", "-")}-mail-forwarder"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "fn" {
  function_name    = "${replace(var.domain_name, ".", "-")}-mail-forwarder"
  role             = aws_iam_role.fn.arn
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  handler          = "index.handler"
  filename         = data.archive_file.code.output_path
  source_code_hash = data.archive_file.code.output_base64sha256
  memory_size      = 256
  timeout          = 30

  environment {
    variables = {
      MAIL_BUCKET = aws_s3_bucket.mail.bucket
      MAIL_FROM   = local.mail_from
      FORWARD_TO  = var.forward_to
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.fn,
    aws_iam_role_policy_attachment.logs,
  ]
}

resource "aws_lambda_permission" "ses" {
  statement_id   = "AllowSES"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.fn.function_name
  principal      = "ses.amazonaws.com"
  source_account = data.aws_caller_identity.current.account_id
}

# ---------- What SES does with an incoming message ----------

resource "aws_ses_receipt_rule_set" "main" {
  rule_set_name = "${replace(var.domain_name, ".", "-")}-inbound"
}

# NOTE: only one rule set can be active per AWS account. If you already receive
# mail for another domain in this account, add a rule to that set instead of
# activating this one.
resource "aws_ses_active_receipt_rule_set" "main" {
  rule_set_name = aws_ses_receipt_rule_set.main.rule_set_name
}

resource "aws_ses_receipt_rule" "forward" {
  name          = "forward"
  rule_set_name = aws_ses_receipt_rule_set.main.rule_set_name
  recipients    = local.rule_recipients
  enabled       = true
  scan_enabled  = true # drop spam and viruses before they reach you
  tls_policy    = "Require"

  s3_action {
    position    = 1
    bucket_name = aws_s3_bucket.mail.bucket
  }

  lambda_action {
    position        = 2
    function_arn    = aws_lambda_function.fn.arn
    invocation_type = "Event"
  }

  depends_on = [
    aws_s3_bucket_policy.mail,
    aws_lambda_permission.ses,
  ]
}
