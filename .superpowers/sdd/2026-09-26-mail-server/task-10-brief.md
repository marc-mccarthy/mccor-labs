## Task 10: Remote state for setup/, and the SES sandbox request

Mail passwords and the SES relay key currently live in a plaintext file on
one laptop.

**Files:**
- Modify: `infra/setup/main.tf` (`terraform` block)
- Modify: `infra/deploy.sh` (setup path)
- Modify: `infra/MAIL.md`

**Interfaces:**
- Consumes: the `mccorlabs-com-tfstate` bucket created by `setup/` itself.
- Produces: nothing.

- [ ] **Step 1: Add the backend block**

In `infra/setup/main.tf`'s `terraform` block:

```hcl
  # This root creates the bucket its own state then lives in, so the very
  # first run is local and migrates afterwards -- see deploy.sh. Written
  # literally because backend blocks cannot use variables; matches
  # local.state_bucket below.
  backend "s3" {
    bucket       = "mccorlabs-com-tfstate"
    key          = "setup/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
```

- [ ] **Step 2: Teach deploy.sh the bootstrap sequence**

Replace the `setup` branch in `deploy.sh`:

```bash
if [[ "$ACTION" == "setup" ]]; then
  (
    cd setup
    # First run: the state bucket does not exist yet, so init without a
    # backend, create it, then migrate this root's own state into it.
    if [[ ! -f .terraform/terraform.tfstate ]] && ! aws s3api head-bucket --bucket "$(grep -oE '[a-z0-9-]+-tfstate' ../versions.tf | head -1)" 2>/dev/null; then
      terraform init -input=false -backend=false
      terraform apply -input=false -var-file=../settings.auto.tfvars
      terraform init -input=false -migrate-state -force-copy
    else
      terraform init -input=false
      terraform apply -input=false -var-file=../settings.auto.tfvars
    fi

    # SES starts sandboxed: 200 messages a day, verified recipients only.
    # There is no Terraform resource for this, but it is scriptable, so it
    # does not become a console step. Approval takes about 24 hours.
    if grep -qE '^\s*enable_mailserver\s*=\s*true' ../settings.auto.tfvars; then
      aws sesv2 put-account-details \
        --production-access-enabled \
        --mail-type TRANSACTIONAL \
        --website-url "https://$(grep -oE 'domain_name *= *"[^"]+"' ../settings.auto.tfvars | cut -d'"' -f2)" \
        --additional-contact-email-addresses "$(grep -oE 'alert_email *= *"[^"]+"' ../settings.auto.tfvars | cut -d'"' -f2)" \
        --contact-language EN 2>/dev/null \
        && echo ">>> SES production access requested (approval ~24h)" \
        || echo ">>> SES production access already requested or granted"
    fi

    echo
    echo "Next: enter these name servers at your registrar (Custom DNS):"
    terraform output -json name_servers
  )
  exit 0
fi
```

- [ ] **Step 3: Check syntax, and prove a second apply is a no-op**

This is Review Focus item 2.

```bash
cd /Users/mj/repos/mccor-labs/infra
bash -n deploy.sh && echo "SHELL SYNTAX OK"
cd setup && AWS_PROFILE=default terraform plan -no-color -input=false \
  -var-file=../settings.auto.tfvars | grep -E "^No changes|^Plan:"
```

Expected: `No changes. Your infrastructure matches the configuration.`
for the currently-applied (mailserver-disabled) state. Any `Plan:` line
here means drift — investigate before continuing.

- [ ] **Step 4: Commit**

```bash
cd /Users/mj/repos/mccor-labs
git add infra/setup/main.tf infra/deploy.sh
git commit -m "feat(infra): remote encrypted state for setup, scripted SES sandbox exit"
```

---

