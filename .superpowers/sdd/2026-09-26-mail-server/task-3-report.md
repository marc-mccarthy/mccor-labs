# Task 3 Report: Deterministic disk mounting that fails closed

## Changes

### `infra/modules/mailserver/main.tf`

1. `aws_ebs_volume.mail` (~line 241): `availability_zone` changed from
   `aws_instance.mail.availability_zone` to
   `data.aws_availability_zones.available.names[0]`, with the comment
   explaining the ForceNew/data-loss reasoning verbatim from the brief.

2. `aws_instance.mail`'s `templatefile` call (~line 275): added
   `mail_device = "/dev/disk/by-id/nvme-Amazon_Elastic_Block_Store_${replace(aws_ebs_volume.mail.id, "-", "")}"`.

### `infra/modules/mailserver/templates/setup.sh.tftpl` (~lines 38-56)

Replaced the `lsblk`-guessing loop with:
- `DEV="${mail_device}"` and a 12x5s wait for the by-id symlink to appear.
- `exit 1` with a `FATAL` message if the device never appears.
- Format-if-empty via `blkid`, mount by `LABEL=maildata`.
- `exit 1` with a `FATAL` message if `/var/mail-data` fails to mount.
- Added `letsencrypt` to the final `mkdir -p /var/mail-data/{...}` set per the brief.

## Commands run

```
$ sed -e 's/\${mail_device}/\/dev\/null/g' -e 's/\${[a-z_]*}/x/g' \
  modules/mailserver/templates/setup.sh.tftpl > "$TMPDIR/rendered.sh"
$ bash -n "$TMPDIR/rendered.sh" && echo "SHELL SYNTAX OK"
SHELL SYNTAX OK
```

```
$ terraform fmt -recursive && terraform -chdir=setup validate -no-color
Success! The configuration is valid.
```
(`terraform fmt -check -recursive infra/` afterward printed nothing, i.e. no diffs.)

```
$ cd setup && AWS_PROFILE=default terraform plan -no-color -input=false \
  -var-file=../settings.auto.tfvars -var enable_mailserver=true
```
Hit one credential flake (`No valid credential sources found`) on attempt 1, succeeded on retry 2.
Result: `Plan: 43 to add, 1 to change, 0 to destroy.` No errors.

Verified in the plan output:
- `module.mailserver[0].aws_ebs_volume.mail`: `availability_zone = "us-east-1a"` — a concrete
  value, not "known after apply", confirming the pin to
  `data.aws_availability_zones.available.names[0]` resolves independently of the instance.
- `aws_instance.mail.user_data` is `(known after apply)` as expected, since it depends on
  `aws_ebs_volume.mail.id` which doesn't exist yet in this fresh-module plan.

All commands run with `dangerouslyDisableSandbox: true` per instructions (TLS interception
otherwise breaks the provider registry).

## Commit

```
$ git add infra/modules/mailserver/main.tf infra/modules/mailserver/templates/setup.sh.tftpl
$ git commit -m "fix(mailserver): mount mail volume by stable device id, fail closed"
[feat/mail-server e52916a] fix(mailserver): mount mail volume by stable device id, fail closed
 2 files changed, 179 insertions(+), 1 deletion(-)
 create mode 100644 infra/modules/mailserver/templates/setup.sh.tftpl
```

Note: `setup.sh.tftpl` shows as a new file in the commit (`create mode`) because the whole
`modules/mailserver/` tree was untracked at session start (per the git status snapshot), not
because this task created the file from scratch — its prior content (from earlier tasks) is
included in this same commit's insertions.

Commit SHA: `e52916a`

## Concerns

None outstanding. The AZ pin resolves to a static value in plan (verified above), the script
fails closed on both "device never appears" and "mount didn't happen", and shell syntax checks
clean. No `apply` was run per constraints.
