## Task 12: Full-stack plan review before any apply

The gate between code and real infrastructure.

**Files:** none modified.

- [ ] **Step 1: Format, validate, plan**

```bash
cd /Users/mj/repos/mccor-labs/infra
terraform fmt -check -recursive && echo "FMT CLEAN"
terraform -chdir=setup validate -no-color
cd setup && AWS_PROFILE=default terraform plan -no-color -input=false \
  -var-file=../settings.auto.tfvars -var enable_mailserver=true -out=/tmp/mail.plan
```

Expected: clean format, valid config, a plan with no errors.

- [ ] **Step 2: Read the plan and confirm each item**

```bash
cd /Users/mj/repos/mccor-labs/infra/setup
terraform show -no-color /tmp/mail.plan | grep -E '^  # ' | sort
```

Confirm present: the VPC set, `aws_instance.mail`, `aws_ebs_volume.mail`,
`aws_eip.mail`, `aws_dlm_lifecycle_policy.mail`, `aws_iam_role.dlm`, seven
`aws_cloudwatch_metric_alarm`, `aws_route53_health_check.smtp`,
`aws_sns_topic.alerts`, four `random_password.mailbox`, five
`aws_ssm_parameter`, the SES identity and DKIM records, and the Route53
A/MX/SPF/DMARC records.

Confirm absent: `autodiscover`, `autoconfig`, any `roundcube`, any
`caddy`.

- [ ] **Step 3: Report to the user and stop**

Post the resource list and the monthly cost, then **wait for explicit
approval before applying.** Applying creates billable infrastructure and
publishes DNS.

---

