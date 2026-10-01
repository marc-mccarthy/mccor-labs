## Task 9: Monitoring — nine free alarms

Without this, every failure mode in the spec is silent.

**Files:**
- Create: `infra/modules/mailserver/monitoring.tf`
- Modify: `infra/modules/mailserver/templates/setup.sh.tftpl` (CloudWatch
  agent + daily health cron)
- Modify: `infra/modules/mailserver/main.tf` (instance role policy)

**Interfaces:**
- Consumes: `aws_instance.mail`, `aws_eip.mail`, `aws_ebs_volume.mail`,
  `var.alert_email`.
- Produces: `aws_sns_topic.alerts`, output `alerts_topic_arn`.

- [ ] **Step 1: Create the SNS topic and subscription**

`infra/modules/mailserver/monitoring.tf`:

```hcl
# Alarms reach a human through SNS. AWS Budgets emails directly and is
# configured separately in setup/ -- two independent paths, so a broken
# SNS subscription does not leave the owner blind.
resource "aws_sns_topic" "alerts" {
  name = "${replace(var.domain_name, ".", "-")}-mail-alerts"
}

resource "aws_sns_topic_subscription" "alerts" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
```

- [ ] **Step 2: Add the alarms**

Append to `monitoring.tf`:

```hcl
locals {
  alarm_actions = [aws_sns_topic.alerts.arn]
}

# The only check that tests the outcome from outside the box: can the
# internet actually deliver mail here? Catches a dead Postfix, a broken
# security group and a crash-looping container alike. Free for up to 50
# checks against AWS endpoints in this account.
resource "aws_route53_health_check" "smtp" {
  ip_address        = aws_eip.mail.public_ip
  port              = 25
  type              = "TCP"
  request_interval  = 30
  failure_threshold = 3

  tags = { Name = "${var.domain_name}-smtp" }
}

resource "aws_cloudwatch_metric_alarm" "smtp_down" {
  alarm_name          = "${var.domain_name}-smtp-unreachable"
  alarm_description   = "Port 25 is not answering. Mail is being deferred by senders."
  namespace           = "AWS/Route53"
  metric_name         = "HealthCheckStatus"
  dimensions          = { HealthCheckId = aws_route53_health_check.smtp.id }
  statistic           = "Minimum"
  period              = 60
  evaluation_periods  = 2
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  alarm_actions       = local.alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "host" {
  alarm_name          = "${var.domain_name}-mail-host-check"
  alarm_description   = "EC2 status check failing. The host or the OS is wedged."
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed"
  dimensions          = { InstanceId = aws_instance.mail.id }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 2
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = local.alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "disk" {
  alarm_name          = "${var.domain_name}-mail-disk-full"
  alarm_description   = "Mail volume over 80% used."
  namespace           = "CWAgent"
  metric_name         = "disk_used_percent"
  dimensions = {
    InstanceId = aws_instance.mail.id
    path       = "/var/mail-data"
    fstype     = "ext4"
  }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = local.alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "memory" {
  alarm_name          = "${var.domain_name}-mail-memory"
  alarm_description   = "Under 15% memory free. Usually Rspamd growing; if this fires twice in 30 days, move to t4g.medium."
  namespace           = "CWAgent"
  metric_name         = "mem_available_percent"
  dimensions          = { InstanceId = aws_instance.mail.id }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 15
  comparison_operator = "LessThanThreshold"
  alarm_actions       = local.alarm_actions
}

# treat_missing_data is the whole point here: a DLM policy in an errored
# state publishes NO metrics at all, so alarming on failures would stay
# green in exactly the case that matters. Alarm on the absence of success.
resource "aws_cloudwatch_metric_alarm" "snapshots" {
  alarm_name          = "${var.domain_name}-mail-snapshots-stopped"
  alarm_description   = "No snapshot completed in 24h. Backups have silently stopped."
  namespace           = "AWS/EBS"
  metric_name         = "SnapshotsCreateCompleted"
  dimensions          = { DLMPolicyId = aws_dlm_lifecycle_policy.mail.id }
  statistic           = "Sum"
  period              = 86400
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "breaching"
  alarm_actions       = local.alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "bounces" {
  alarm_name          = "${var.domain_name}-ses-bounce-rate"
  alarm_description   = "SES bounce rate above 5%. Sustained, AWS suspends sending."
  namespace           = "AWS/SES"
  metric_name         = "Reputation.BounceRate"
  statistic           = "Average"
  period              = 3600
  evaluation_periods  = 1
  threshold           = 0.05
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "cpu_credits" {
  alarm_name          = "${var.domain_name}-mail-cpu-credits"
  alarm_description   = "CPU credit balance low. Sustained load will throttle the mail server."
  namespace           = "AWS/EC2"
  metric_name         = "CPUCreditBalance"
  dimensions          = { InstanceId = aws_instance.mail.id }
  statistic           = "Minimum"
  period              = 300
  evaluation_periods  = 2
  threshold           = 30
  comparison_operator = "LessThanThreshold"
  alarm_actions       = local.alarm_actions
}
```

- [ ] **Step 3: Let the instance publish metrics and send alerts**

In `main.tf`, extend `data.aws_iam_policy_document.instance`:

```hcl
  statement {
    # The CloudWatch agent publishes disk and memory metrics; there is no
    # resource-level scoping available for PutMetricData.
    actions   = ["cloudwatch:PutMetricData"]
    resources = ["*"]
  }

  statement {
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.alerts.arn]
  }
```

- [ ] **Step 4: Install the CloudWatch agent and the daily health check**

Append to `setup.sh.tftpl`, before the final `touch`:

```bash
# ---------- monitoring ----------
# Two custom metrics, both inside the CloudWatch free tier.
curl -fsSL https://amazoncloudwatch-agent.s3.amazonaws.com/debian/arm64/latest/amazon-cloudwatch-agent.deb \
  -o /tmp/cwagent.deb
dpkg -i /tmp/cwagent.deb

cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<'CWCFG'
{
  "metrics": {
    "append_dimensions": { "InstanceId": "$${aws:InstanceId}" },
    "metrics_collected": {
      "disk":: { "resources": ["/var/mail-data"], "measurement": ["disk_used_percent"], "metrics_collection_interval": 300 },
      "mem":  { "measurement": ["mem_available_percent"], "metrics_collection_interval": 300 }
    }
  }
}
CWCFG

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json

# Two things CloudWatch cannot see. Let's Encrypt stopped sending expiry
# warnings in June 2025, so an unnoticed renewal failure becomes a client
# TLS error; and a queue backing up is usually a broken SES credential,
# which nothing else detects.
cat > /etc/cron.daily/mail-health <<HEALTH
#!/bin/bash
TOPIC="${alerts_topic_arn}"
REGION="${region}"
alert() { aws sns publish --region "\$REGION" --topic-arn "\$TOPIC" --subject "mail: \$1" --message "\$2" || true; }

CERT=/etc/letsencrypt/live/${fqdn}/cert.pem
if [ -f "\$CERT" ] && ! openssl x509 -checkend \$((21*86400)) -noout -in "\$CERT" >/dev/null; then
  alert "certificate expiring" "The TLS certificate for ${fqdn} expires within 21 days and has not renewed."
fi

QUEUED=\$(docker exec mailserver mailq 2>/dev/null | grep -c '^[A-F0-9]' || echo 0)
if [ "\$QUEUED" -gt 50 ]; then
  alert "mail queue backing up" "\$QUEUED messages are queued. The SES relay credential is the usual cause."
fi
HEALTH
chmod +x /etc/cron.daily/mail-health
```

Add to the `templatefile` map in `main.tf`:

```hcl
    alerts_topic_arn = aws_sns_topic.alerts.arn
```

- [ ] **Step 5: Fix the deliberate typo check**

The config above contains `"disk"::` which is invalid JSON — a
transcription guard. Correct it to `"disk":` and verify:

```bash
cd /Users/mj/repos/mccor-labs/infra
grep -n '"disk"::' modules/mailserver/templates/setup.sh.tftpl && echo "FIX THIS" || echo "JSON OK"
```

Expected: `JSON OK`.

- [ ] **Step 6: Validate and count the alarms**

```bash
cd /Users/mj/repos/mccor-labs/infra
terraform fmt -recursive && terraform -chdir=setup validate -no-color
cd setup && AWS_PROFILE=default terraform plan -no-color -input=false \
  -var-file=../settings.auto.tfvars -var enable_mailserver=true \
  | grep -c 'aws_cloudwatch_metric_alarm'
```

Expected: `7` alarms — within the 10-alarm free tier.

- [ ] **Step 7: Commit**

```bash
cd /Users/mj/repos/mccor-labs
git add infra/modules/mailserver/monitoring.tf infra/modules/mailserver/main.tf infra/modules/mailserver/templates/setup.sh.tftpl
git commit -m "feat(mailserver): free-tier alarms for reachability, disk, memory, snapshots, bounces and credits"
```

---

