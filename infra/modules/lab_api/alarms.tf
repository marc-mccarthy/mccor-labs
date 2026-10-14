locals {
  url_functions = {
    contact  = aws_lambda_function.contact.function_name
    feedback = aws_lambda_function.feedback.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "url_5xx" {
  for_each = local.url_functions

  alarm_name          = "${each.value}-url-5xx"
  alarm_description   = "The ${each.key} function URL returned a 5xx response"
  namespace           = "AWS/Lambda"
  metric_name         = "Url5xxCount"
  statistic           = "Sum"
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  period              = 300
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"
  dimensions          = { FunctionName = each.value }
  alarm_actions       = [var.alarm_topic_arn]
}

resource "aws_cloudwatch_metric_alarm" "digest_errors" {
  alarm_name          = "${var.name}-lab-digest-errors"
  alarm_description   = "The weekly digest function failed"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  period              = 300
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"
  dimensions          = { FunctionName = aws_lambda_function.digest.function_name }
  alarm_actions       = [var.alarm_topic_arn]
}

resource "aws_cloudwatch_metric_alarm" "digest_async_dropped" {
  alarm_name          = "${var.name}-lab-digest-async-dropped"
  alarm_description   = "Lambda dropped a digest invocation without running it to success"
  namespace           = "AWS/Lambda"
  metric_name         = "AsyncEventsDropped"
  statistic           = "Sum"
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  period              = 300
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"
  dimensions          = { FunctionName = aws_lambda_function.digest.function_name }
  alarm_actions       = [var.alarm_topic_arn]
}

resource "aws_sqs_queue" "digest_dlq" {
  name                      = "${var.name}-lab-digest-dlq"
  sqs_managed_sse_enabled   = true
  message_retention_seconds = 1209600
}

resource "aws_cloudwatch_metric_alarm" "digest_dlq_visible" {
  alarm_name          = "${var.name}-lab-digest-dlq-visible"
  alarm_description   = "EventBridge Scheduler could not deliver the weekly digest invocation"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  period              = 300
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"
  dimensions          = { QueueName = aws_sqs_queue.digest_dlq.name }
  alarm_actions       = [var.alarm_topic_arn]
}
