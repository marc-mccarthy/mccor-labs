mock_provider "aws" {
  mock_data "aws_iam_policy_document" {
    defaults = { json = "{\"Version\":\"2012-10-17\"}" }
  }

  mock_data "aws_availability_zones" {
    defaults = { names = ["us-east-1a"] }
  }

  mock_resource "aws_ses_domain_dkim" {
    defaults = { dkim_tokens = ["a", "b", "c"] }
  }
}

mock_provider "random" {}

variables {
  name          = "t"
  domain_name   = "example.com"
  zone_id       = "Z1"
  mailboxes     = { marcm = "Marc M" }
  admin_mailbox = "marcm"
  alert_email   = "ops@example.net"
}

run "bimi" {
  command = plan

  assert {
    condition     = aws_route53_record.bimi.name == "default._bimi.example.com"
    error_message = "BIMI record must sit at default._bimi.<domain>."
  }

  assert {
    condition     = aws_route53_record.bimi.type == "TXT"
    error_message = "BIMI record must be TXT."
  }

  assert {
    condition     = aws_route53_record.bimi.records == toset(["v=BIMI1; l=https://example.com/bimi/logo.svg; a="])
    error_message = "BIMI record must point at the logo served from the apex domain."
  }
}

run "sender_names" {
  command = plan

  variables {
    mailboxes = { marcm = "Marc McCarthy", mariem = "Marie O'Neil-Smith Jr." }
  }

  assert {
    condition     = aws_ssm_parameter.sender_name["marcm"].name == "/t/mail/_names/marcm"
    error_message = "Sender names must live under <prefix>/_names so the account sync skips them."
  }

  assert {
    condition     = aws_ssm_parameter.sender_name["marcm"].value == "Marc McCarthy" && aws_ssm_parameter.sender_name["marcm"].type == "String"
    error_message = "Each mailbox's display name must be published as a plain String parameter."
  }

  assert {
    condition     = aws_ssm_parameter.sender_name["mariem"].value == "Marie O'Neil-Smith Jr."
    error_message = "Apostrophes, dashes and dots must be allowed in names."
  }
}

run "rejects_unsafe_sender_name" {
  command = plan

  variables {
    mailboxes = { marcm = "Marc \"x\" <evil@example.org>" }
  }

  expect_failures = [var.mailboxes]
}
