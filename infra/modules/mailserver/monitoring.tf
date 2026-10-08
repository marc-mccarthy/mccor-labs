resource "aws_sns_topic" "alerts" {
  name = "${var.name}-mail-alerts"
}

resource "aws_sns_topic_subscription" "alerts" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

locals {
  alarm_actions = [aws_sns_topic.alerts.arn]
}

resource "aws_route53_health_check" "smtp" {
  ip_address        = aws_eip.mail.public_ip
  port              = 25
  type              = "TCP"
  request_interval  = 30
  failure_threshold = 3

  tags = { Name = "${var.name}-mail-smtp" }
}

resource "aws_cloudwatch_metric_alarm" "smtp_down" {
  alarm_name          = "${var.name}-mail-smtp-unreachable"
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
  alarm_name          = "${var.name}-mail-host-check"
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
  alarm_name        = "${var.name}-mail-disk-full"
  alarm_description = "Mail volume over 80% used."
  namespace         = "CWAgent"
  metric_name       = "disk_used_percent"
  dimensions = {
    InstanceId = aws_instance.mail.id
    path       = "/var/mail-data"
    fstype     = "ext4"
    device     = "nvme1n1"
  }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 6
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "breaching"
  alarm_actions       = local.alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "memory" {
  alarm_name          = "${var.name}-mail-memory"
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

resource "aws_cloudwatch_metric_alarm" "snapshots" {
  alarm_name          = "${var.name}-mail-snapshots-stopped"
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
  alarm_name          = "${var.name}-mail-ses-bounce-rate"
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
  alarm_name          = "${var.name}-mail-cpu-credits"
  alarm_description   = "CPU credit balance low. Sustained load will throttle the mail server."
  namespace           = "AWS/EC2"
  metric_name         = "CPUCreditBalance"
  dimensions          = { InstanceId = aws_instance.mail.id }
  statistic           = "Minimum"
  period              = 900
  evaluation_periods  = 12
  threshold           = 30
  comparison_operator = "LessThanThreshold"
  alarm_actions       = local.alarm_actions
}
