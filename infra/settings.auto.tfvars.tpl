# ---------------------------------------------------------------
# Template. Values are references, not secrets, so this IS committed.
#
# `./deploy.sh` renders it into settings.auto.tfvars with:
#     op inject -i settings.auto.tfvars.tpl -o settings.auto.tfvars
#
# The generated file is gitignored. Edit values in 1Password
# (Development vault, item "mccor-labs-infra"), never in the generated
# file -- the next deploy overwrites it.
# ---------------------------------------------------------------

project     = "op://Development/mccor-labs-infra/project"
domain_name = "op://Development/mccor-labs-infra/domain_name"
alert_email = "op://Development/mccor-labs-infra/alert_email"

monthly_budget_usd = op://Development/mccor-labs-infra/monthly_budget_usd

# ---------------------------------------------------------------
# Your own mail server
# ---------------------------------------------------------------

enable_mailserver = op://Development/mccor-labs-infra/enable_mailserver

# Mailbox local part => display name. The local parts are public (they are
# in the header of every message these people send); the display names live
# in 1Password with everything else so there is one place to edit.
mailboxes = {
  marcm    = "op://Development/mccor-labs-infra/marcm"
  nateb    = "op://Development/mccor-labs-infra/nateb"
  kirstenh = "op://Development/mccor-labs-infra/kirstenh"
  ashleyt  = "op://Development/mccor-labs-infra/ashleyt"
  mariem   = "op://Development/mccor-labs-infra/mariem"
}

# Which mailbox receives postmaster@, abuse@ and the DMARC reports.
admin_mailbox = "op://Development/mccor-labs-infra/admin_mailbox"

# Instance size. t4g.small (2GB) is the smallest that runs the mail stack and
# its spam filter safely -- t4g.micro is below docker-mailserver's documented
# floor and risks the kernel OOM-killing Rspamd, which fails open and stops
# filtering silently. Move up to t4g.medium if the memory alarm fires more
# than twice in thirty days.
instance_type  = "op://Development/mccor-labs-infra/instance_type"
mail_volume_gb = op://Development/mccor-labs-infra/mail_volume_gb
