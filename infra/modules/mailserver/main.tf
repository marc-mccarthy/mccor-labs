terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6"
    }
  }
}

data "aws_region" "current" {}
data "aws_default_tags" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  fqdn      = "${var.hostname}.${var.domain_name}"
  addresses = { for k, v in var.mailboxes : k => "${k}@${var.domain_name}" }

  snapshot_tag = "${var.name}-mail"
}

resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

resource "aws_route53_record" "dkim" {
  count = 3

  zone_id = var.zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_iam_user" "smtp" {
  name = "${var.name}-mail-relay"
}

data "aws_iam_policy_document" "smtp" {
  statement {
    actions   = ["ses:SendRawEmail"]
    resources = [aws_ses_domain_identity.main.arn]
  }
}

resource "aws_iam_user_policy" "smtp" {
  name   = "send-mail"
  user   = aws_iam_user.smtp.name
  policy = data.aws_iam_policy_document.smtp.json
}

resource "aws_iam_access_key" "smtp" {
  user = aws_iam_user.smtp.name
}

resource "random_password" "mailbox" {
  for_each = var.mailboxes

  length           = 20
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
  min_special      = 2
  override_special = "!#$%&*()-_=+"
}

resource "aws_ssm_parameter" "mailbox" {
  for_each = var.mailboxes

  name  = "/${var.name}/mail/${each.key}"
  type  = "SecureString"
  value = random_password.mailbox[each.key].result
}

resource "aws_ssm_parameter" "sender_name" {
  for_each = var.mailboxes

  name  = "/${var.name}/mail/_names/${each.key}"
  type  = "String"
  value = each.value
}

resource "aws_ssm_parameter" "smtp_password" {
  name  = "/${var.name}/mail/_relay_password"
  type  = "SecureString"
  value = aws_iam_access_key.smtp.ses_smtp_password_v4
}

data "aws_ami" "debian" {
  most_recent = true
  owners      = ["136693071363"]

  filter {
    name   = "name"
    values = ["debian-12-arm64-*"]
  }
}

resource "aws_vpc" "mail" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.name}-mail" }
}

resource "aws_internet_gateway" "mail" {
  vpc_id = aws_vpc.mail.id

  tags = { Name = "${var.name}-mail" }
}

resource "aws_subnet" "mail" {
  vpc_id                  = aws_vpc.mail.id
  cidr_block              = "10.20.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = { Name = "${var.name}-mail" }
}

resource "aws_route_table" "mail" {
  vpc_id = aws_vpc.mail.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.mail.id
  }

  tags = { Name = "${var.name}-mail" }
}

resource "aws_route_table_association" "mail" {
  subnet_id      = aws_subnet.mail.id
  route_table_id = aws_route_table.mail.id
}

resource "aws_security_group" "mail" {
  name        = "${var.name}-mail"
  description = "Mail server: SMTP in, IMAP and submission for clients, HTTP for certificate renewal"
  vpc_id      = aws_vpc.mail.id
}

resource "aws_vpc_security_group_ingress_rule" "mail" {
  for_each = {
    smtp       = { port = 25, note = "inbound mail from other servers" }
    http       = { port = 80, note = "ACME certificate renewal" }
    submission = { port = 587, note = "your people sending (STARTTLS)" }
    imaps      = { port = 993, note = "your people reading" }
  }

  security_group_id = aws_security_group.mail.id
  description       = each.value.note
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = each.value.port
  to_port           = each.value.port
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.mail.id
  description       = "outbound: SES relay, package updates, ACME"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_iam_role" "instance" {
  name = "${var.name}-mail-instance"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "instance" {
  statement {
    actions = ["ssm:GetParameter", "ssm:GetParametersByPath"]
    resources = [
      "arn:aws:ssm:${data.aws_region.current.region}:*:parameter/${var.name}/mail",
      "arn:aws:ssm:${data.aws_region.current.region}:*:parameter/${var.name}/mail/*",
    ]
  }

  statement {
    actions   = ["cloudwatch:PutMetricData"]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "cloudwatch:namespace"
      values   = ["CWAgent"]
    }
  }

  statement {
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.alerts.arn]
  }
}

resource "aws_iam_role_policy" "instance" {
  name   = "read-mail-secrets"
  role   = aws_iam_role.instance.id
  policy = data.aws_iam_policy_document.instance.json
}

resource "aws_iam_instance_profile" "instance" {
  name = "${var.name}-mail-instance"
  role = aws_iam_role.instance.name
}

resource "aws_ebs_volume" "mail" {
  availability_zone = data.aws_availability_zones.available.names[0]
  size              = var.mail_volume_gb
  type              = "gp3"
  encrypted         = true

  tags = {
    Name   = "${var.name}-mail-data"
    Backup = local.snapshot_tag
  }
}

resource "aws_volume_attachment" "mail" {
  device_name = "/dev/xvdf"
  volume_id   = aws_ebs_volume.mail.id
  instance_id = aws_instance.mail.id

  stop_instance_before_detaching = true
}

resource "aws_instance" "mail" {
  ami                    = data.aws_ami.debian.id
  instance_type          = var.instance_type
  iam_instance_profile   = aws_iam_instance_profile.instance.name
  vpc_security_group_ids = [aws_security_group.mail.id]
  subnet_id              = aws_subnet.mail.id

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
    # Without explicit tags the plan drops Project from the root volume, so its cost would go untagged
    tags = data.aws_default_tags.current.tags
  }

  user_data_replace_on_change = true
  user_data = templatefile("${path.module}/templates/setup.sh.tftpl", {
    domain           = var.domain_name
    fqdn             = local.fqdn
    region           = data.aws_region.current.region
    relay_user       = aws_iam_access_key.smtp.id
    alert_email      = var.alert_email
    param_prefix     = "/${var.name}/mail"
    postmaster       = "postmaster@${var.domain_name}"
    admin_address    = "${var.admin_mailbox}@${var.domain_name}"
    mail_device      = "/dev/disk/by-id/nvme-Amazon_Elastic_Block_Store_${replace(aws_ebs_volume.mail.id, "-", "")}"
    alerts_topic_arn = aws_sns_topic.alerts.arn
  })

  metadata_options {
    http_tokens                 = "required"
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 1
  }

  credit_specification {
    cpu_credits = "standard"
  }

  lifecycle {
    ignore_changes = [ami]
  }

  tags = { Name = "${var.name}-mail" }
}

resource "aws_eip" "mail" {
  instance = aws_instance.mail.id
  domain   = "vpc"

  tags = { Name = "${var.name}-mail" }
}

resource "aws_route53_record" "mail_a" {
  zone_id = var.zone_id
  name    = local.fqdn
  type    = "A"
  ttl     = 300
  records = [aws_eip.mail.public_ip]
}

resource "aws_route53_record" "mx" {
  zone_id = var.zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = 600
  records = ["10 ${local.fqdn}"]
}

resource "aws_route53_record" "spf" {
  zone_id = var.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com -all"]
}

resource "aws_route53_record" "dmarc" {
  zone_id = var.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=DMARC1; p=quarantine; rua=mailto:${var.admin_mailbox}@${var.domain_name}"]
}

resource "aws_route53_record" "bimi" {
  zone_id = var.zone_id
  name    = "default._bimi.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=BIMI1; l=https://${var.domain_name}/bimi/logo.svg; a="]
}

resource "aws_iam_role" "dlm" {
  name = "${var.name}-mail-dlm"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "dlm.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "dlm" {
  role       = aws_iam_role.dlm.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

resource "aws_dlm_lifecycle_policy" "mail" {
  description        = "${local.snapshot_tag} mail volume"
  execution_role_arn = aws_iam_role.dlm.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]

    target_tags = {
      Backup = local.snapshot_tag
    }

    schedule {
      name = "6-hourly"

      create_rule {
        interval      = 6
        interval_unit = "HOURS"
        times         = ["00:00"]
      }

      retain_rule {
        count = 28
      }

      tags_to_add = {
        Name   = "${var.name}-mail-data"
        Backup = local.snapshot_tag
      }

      copy_tags = true
    }
  }
}
