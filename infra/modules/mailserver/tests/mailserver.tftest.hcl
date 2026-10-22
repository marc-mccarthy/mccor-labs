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
