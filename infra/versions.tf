terraform {
  required_version = "~> 1.16"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.58"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.8"
    }
  }

  # Backend blocks cannot use variables, so this is written out literally.
  # It must match local.state_bucket in setup/main.tf, which derives the name
  # from domain_name in settings.auto.tfvars: mccorlabs.com -> mccorlabs-com.
  # Each environment (main, mm, jd, ...) gets its own state file here.
  backend "s3" {
    bucket       = "mccorlabs-com-tfstate"
    key          = "app/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}

# Everything lives in us-east-1 because CloudFront certificates must be there.
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = var.project
      Env       = local.is_main ? "main" : local.env_id
      ManagedBy = "terraform"
    }
  }
}
