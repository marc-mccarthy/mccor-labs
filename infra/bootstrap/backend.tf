terraform {
  backend "s3" {
    bucket       = "mccorlabs-tfstate-150701180133"
    key          = "bootstrap/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}
