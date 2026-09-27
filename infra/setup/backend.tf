# This root creates the bucket its own state then lives in, so the very
# first apply has to run with no backend configured at all -- not merely
# `-backend=false`, which only skips writing the backend record and still
# leaves `plan`/`apply` refusing to proceed once a `backend "s3" {}` block
# is present in config but unconfirmed in .terraform/terraform.tfstate
# ("Backend initialization required... use -reconfigure or -migrate-state").
# Terraform sees that combination as a backend CHANGE, not as "no backend",
# and there is no flag that makes plan/apply tolerate it.
#
# So this block lives alone in its own file: deploy.sh renames this file
# aside for the bootstrap apply (no backend block in play at all -> a plain
# local init works), then restores it and migrates. Every later run finds
# this file present from the start and never has to touch it.
#
# Written literally because backend blocks cannot use variables; matches
# local.state_bucket in main.tf.
terraform {
  backend "s3" {
    bucket       = "mccorlabs-com-tfstate"
    key          = "setup/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}
