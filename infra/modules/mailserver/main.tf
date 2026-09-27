# Your own mail server, on your own instance, holding your own mailboxes.
#
# Receiving is direct: the internet delivers to this box on port 25, it runs
# the spam filter, and it stores mail on a disk you own. Nobody else holds
# the mailboxes.
#
# Sending goes out through SES on port 587 instead of straight to the world on
# port 25. Two reasons, both practical: AWS blocks outbound 25 on every EC2
# instance until you petition them to unblock it, and a brand-new IP address
# has no sending reputation, so Gmail and Outlook treat its mail as suspicious.
# Relaying through SES avoids both. SES is in your own account -- this is not a
# third party holding your mail, only the last hop that hands it over.

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
data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  fqdn      = "${var.hostname}.${var.domain_name}"
  addresses = { for k, v in var.mailboxes : k => "${k}@${var.domain_name}" }
}

# ---------- Sending: SES as the outbound relay ----------

resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# Lets receiving servers verify the signature SES puts on your outgoing mail.
resource "aws_route53_record" "dkim" {
  count = 3

  zone_id = var.zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# An IAM user whose only power is handing mail to SES. Its access key doubles
# as an SMTP password through a documented conversion, which is why the server
# can authenticate to SES with plain SMTP.
resource "aws_iam_user" "smtp" {
  name = "${replace(var.domain_name, ".", "-")}-mail-relay"
}

data "aws_iam_policy_document" "smtp" {
  statement {
    actions   = ["ses:SendRawEmail"]
    resources = ["*"]
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

# ---------- The mailboxes themselves ----------

# One password per person, generated here and handed to the server through
# Parameter Store rather than baked into user data (which any process on the
# instance can read from the metadata endpoint).
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

  name  = "/${var.domain_name}/mail/${each.key}"
  type  = "SecureString"
  value = random_password.mailbox[each.key].result
}

resource "aws_ssm_parameter" "smtp_password" {
  name  = "/${var.domain_name}/mail/_relay_password"
  type  = "SecureString"
  value = aws_iam_access_key.smtp.ses_smtp_password_v4
}

# ---------- The server ----------

data "aws_ami" "debian" {
  most_recent = true
  owners      = ["136693071363"] # Debian

  filter {
    name   = "name"
    values = ["debian-12-arm64-*"]
  }
}

# ---------- Network ----------

# This account has no default VPC, and a mail server wants a stable, minimal
# network anyway: one public subnet, one route to the internet, nothing else.
resource "aws_vpc" "mail" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.domain_name}-mail" }
}

resource "aws_internet_gateway" "mail" {
  vpc_id = aws_vpc.mail.id

  tags = { Name = "${var.domain_name}-mail" }
}

resource "aws_subnet" "mail" {
  vpc_id                  = aws_vpc.mail.id
  cidr_block              = "10.20.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = { Name = "${var.domain_name}-mail" }
}

resource "aws_route_table" "mail" {
  vpc_id = aws_vpc.mail.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.mail.id
  }

  tags = { Name = "${var.domain_name}-mail" }
}

resource "aws_route_table_association" "mail" {
  subnet_id      = aws_subnet.mail.id
  route_table_id = aws_route_table.mail.id
}

resource "aws_security_group" "mail" {
  name_prefix = "${replace(var.domain_name, ".", "-")}-mail-"
  description = "Mail server: SMTP in, IMAP and submission for clients, HTTP for certificate renewal"
  vpc_id      = aws_vpc.mail.id
}

# Port 25 is how other mail servers deliver to you, so it has to be open to
# the whole internet. 587 and 465 are how your own people send. 993 is how
# their mail clients read. 80 is only used by Let's Encrypt renewals.
resource "aws_vpc_security_group_ingress_rule" "mail" {
  for_each = {
    smtp       = { port = 25, note = "inbound mail from other servers" }
    http       = { port = 80, note = "Let's Encrypt renewal" }
    submission = { port = 587, note = "your people sending (STARTTLS)" }
    smtps      = { port = 465, note = "your people sending (implicit TLS)" }
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
  description       = "outbound: SES relay, package updates, Let's Encrypt"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

# Shell access is through SSM Session Manager, so there is no SSH port open
# and no key to lose.
resource "aws_iam_role" "instance" {
  name_prefix = "${replace(var.domain_name, ".", "-")}-mail-"

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

# Read only this domain's own secrets, nothing else in Parameter Store.
data "aws_iam_policy_document" "instance" {
  statement {
    actions   = ["ssm:GetParameter", "ssm:GetParametersByPath"]
    resources = ["arn:aws:ssm:${data.aws_region.current.region}:*:parameter/${var.domain_name}/mail/*"]
  }
}

resource "aws_iam_role_policy" "instance" {
  name   = "read-mail-secrets"
  role   = aws_iam_role.instance.id
  policy = data.aws_iam_policy_document.instance.json
}

resource "aws_iam_instance_profile" "instance" {
  name_prefix = "${replace(var.domain_name, ".", "-")}-mail-"
  role        = aws_iam_role.instance.name
}

# Mail lives on its own disk. Rebuild or resize the server and the mail is
# untouched, because it was never on the root volume.
resource "aws_ebs_volume" "mail" {
  # Pinned to the same AZ as the subnet, NOT read off the instance. On
  # instance replacement the instance's AZ becomes "known after apply",
  # which forces replacement of this volume -- and availability_zone is
  # ForceNew, so that is data loss. Do not "simplify" this line.
  availability_zone = data.aws_availability_zones.available.names[0]
  size              = var.mail_volume_gb
  type              = "gp3"
  encrypted         = true

  tags = { Name = "${var.domain_name}-mail-data" }
}

resource "aws_volume_attachment" "mail" {
  device_name = "/dev/xvdf"
  volume_id   = aws_ebs_volume.mail.id
  instance_id = aws_instance.mail.id
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
  }

  user_data_replace_on_change = true
  user_data = templatefile("${path.module}/templates/setup.sh.tftpl", {
    domain        = var.domain_name
    fqdn          = local.fqdn
    region        = data.aws_region.current.region
    relay_user    = aws_iam_access_key.smtp.id
    alert_email   = var.alert_email
    mailbox_names = join(" ", sort(keys(var.mailboxes)))
    param_prefix  = "/${var.domain_name}/mail"
    postmaster    = "postmaster@${var.domain_name}"
    admin_address = "${var.admin_mailbox}@${var.domain_name}"
    mail_device   = "/dev/disk/by-id/nvme-Amazon_Elastic_Block_Store_${replace(aws_ebs_volume.mail.id, "-", "")}"
  })

  # Containers must not be able to reach instance credentials: one hop is
  # the host itself, so a container's request is dropped. Without this,
  # anything running here can read every mailbox password from SSM.
  metadata_options {
    http_tokens                 = "required"
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 1
  }

  # T-series defaults to "unlimited", which bills for sustained bursts.
  # A spam flood would quietly make this an expensive instance.
  credit_specification {
    cpu_credits = "standard"
  }

  lifecycle {
    # data.aws_ami.debian is most_recent, so a new Debian release would
    # otherwise replace this instance during an unrelated apply. OS
    # upgrades are deliberate: terraform apply -replace=...
    ignore_changes = [ami]
  }

  tags = { Name = "${var.domain_name}-mail" }
}

# A fixed address, so the MX record and the reverse-DNS record stay valid
# across reboots and rebuilds.
resource "aws_eip" "mail" {
  instance = aws_instance.mail.id
  domain   = "vpc"

  tags = { Name = "${var.domain_name}-mail" }
}

# ---------- DNS ----------

resource "aws_route53_record" "mail_a" {
  zone_id = var.zone_id
  name    = local.fqdn
  type    = "A"
  ttl     = 300
  records = [aws_eip.mail.public_ip]
}

# Where the world delivers mail for this domain.
resource "aws_route53_record" "mx" {
  zone_id = var.zone_id
  name    = var.domain_name
  type    = "MX"
  ttl     = 600
  records = ["10 ${local.fqdn}"]
}

# Who is allowed to send as this domain: SES, because that is the relay, and
# the server's own address for anything that bypasses it.
resource "aws_route53_record" "spf" {
  zone_id = var.zone_id
  name    = var.domain_name
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ip4:${aws_eip.mail.public_ip} -all"]
}

# Start at p=none so you can watch the reports without mail being rejected
# while DNS settles. Tighten to quarantine, then reject, once it is clean.
resource "aws_route53_record" "dmarc" {
  zone_id = var.zone_id
  name    = "_dmarc.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = ["v=DMARC1; p=none; rua=mailto:${var.admin_mailbox}@${var.domain_name}"]
}

# Lets Apple Mail, Outlook and Thunderbird configure themselves from just an
# address and password.
resource "aws_route53_record" "autodiscover" {
  zone_id = var.zone_id
  name    = "autodiscover.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = [local.fqdn]
}

resource "aws_route53_record" "autoconfig" {
  zone_id = var.zone_id
  name    = "autoconfig.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = [local.fqdn]
}
