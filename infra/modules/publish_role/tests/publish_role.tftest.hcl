mock_provider "aws" {}

variables {
  name             = "t"
  account_id       = "111111111111"
  site_bucket_arn  = "arn:aws:s3:::t-site"
  distribution_arn = "arn:aws:cloudfront::111111111111:distribution/EDFDVBD6EXAMPLE"
  state_bucket     = "t-tfstate"
}

run "least_privilege" {
  command = plan

  assert {
    condition     = aws_iam_role.publish.name == "t-publish"
    error_message = "Role must be named <name>-publish."
  }

  assert {
    condition = jsondecode(aws_iam_role.publish.assume_role_policy).Statement == [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { AWS = "arn:aws:iam::111111111111:root" }
    }]
    error_message = "Only the account root may assume the role, and only with sts:AssumeRole."
  }

  assert {
    condition = jsondecode(aws_iam_role_policy.publish.policy).Statement == [
      { Effect = "Allow", Action = ["s3:ListBucket"], Resource = "arn:aws:s3:::t-site" },
      { Effect = "Allow", Action = ["s3:PutObject", "s3:DeleteObject"], Resource = "arn:aws:s3:::t-site/*" },
      { Effect = "Allow", Action = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"], Resource = "arn:aws:cloudfront::111111111111:distribution/EDFDVBD6EXAMPLE" },
      { Effect = "Allow", Action = ["s3:ListBucket"], Resource = "arn:aws:s3:::t-tfstate" },
      { Effect = "Allow", Action = ["s3:GetObject"], Resource = ["arn:aws:s3:::t-tfstate/app/terraform.tfstate", "arn:aws:s3:::t-tfstate/env:/*/app/terraform.tfstate"] },
    ]
    error_message = "Publish policy must be exactly the 5 scoped statements."
  }

  assert {
    condition     = alltrue([for s in jsondecode(aws_iam_role_policy.publish.policy).Statement : !contains(flatten([s.Resource]), "*")])
    error_message = "No statement may use a \"*\" resource."
  }

  assert {
    condition     = alltrue([for s in jsondecode(aws_iam_role_policy.publish.policy).Statement : !contains(flatten([s.Resource]), "arn:aws:s3:::t-tfstate/*")])
    error_message = "No statement may cover the whole state bucket."
  }

  assert {
    condition     = alltrue([for r in flatten([for s in jsondecode(aws_iam_role_policy.publish.policy).Statement : s.Resource]) : !strcontains(r, "setup/")])
    error_message = "The publish role must not reach setup/ state."
  }
}
