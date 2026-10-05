terraform {
  backend "s3" {
    bucket       = "mccorlabs-com-tfstate"
    key          = "setup/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}
