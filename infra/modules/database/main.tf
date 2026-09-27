terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0"
    }
  }
}

# One table, "single-table design": every record has a partition key (pk) and a
# sort key (sk). Example: pk = USER#<id>, sk = ITEM#<id>.
#
# PROVISIONED mode on purpose: AWS's always-free tier covers 25 GB of storage
# plus 25 read and 25 write capacity units per account, but only in this mode.
resource "aws_dynamodb_table" "this" {
  name                        = var.name
  billing_mode                = "PROVISIONED"
  read_capacity               = var.read_capacity
  write_capacity              = var.write_capacity
  hash_key                    = "pk"
  range_key                   = "sk"
  deletion_protection_enabled = var.deletion_protection

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  point_in_time_recovery {
    enabled = var.point_in_time_recovery
  }
}
