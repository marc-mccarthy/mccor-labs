#!/usr/bin/env bash
set -euo pipefail

TEMPLATE="$(dirname "$0")/../modules/mailserver/templates/setup.sh.tftpl"
BASE="$(mktemp -d)"
trap 'rm -rf "$BASE"' EXIT

# shellcheck disable=SC2016
awk "/^cat > \/opt\/mail\/sync-accounts.sh <<'SYNC'$/ { on = 1; next } /^SYNC$/ { on = 0 } on" "$TEMPLATE" |
  sed -e 's/\${domain}/example.test/g' \
    -e 's/\${region}/us-east-1/g' \
    -e 's#\${param_prefix}#/example.test/mail#g' \
    -e 's/\$\${/${/g' >"$BASE/sync-accounts.sh"
chmod +x "$BASE/sync-accounts.sh"

mkdir -p "$BASE/bin"
cat >"$BASE/bin/aws" <<'AWS'
#!/usr/bin/env bash
[[ "${FAKE_SSM_FAIL:-}" == 1 ]] && { echo "AccessDenied" >&2; exit 255; }
cat "$FAKE_SSM"
AWS
cat >"$BASE/bin/docker" <<'DOCKER'
#!/usr/bin/env bash
exit 0
DOCKER
chmod +x "$BASE/bin/aws" "$BASE/bin/docker"

export ACCOUNTS_FILE="$BASE/postfix-accounts.cf"
export FAKE_SSM="$BASE/ssm.txt"

ssm() {
  printf '%s\n' "$@" >"$FAKE_SSM"
}

run_sync() {
  PATH="$BASE/bin:$PATH" "$BASE/sync-accounts.sh" 2>&1
}

accounts() {
  cut -d'|' -f1 "$ACCOUNTS_FILE" | sort | tr '\n' ' '
}

fail() {
  echo "FAIL $1" >&2
  exit 1
}

: >"$ACCOUNTS_FILE"
ssm "/example.test/mail/marcm	pw-m" "/example.test/mail/kirstenh	pw-k" "/example.test/mail/_relay	ignored"
out="$(run_sync)" || fail "first sync exited non-zero: $out"
[[ "$(accounts)" == "kirstenh@example.test marcm@example.test " ]] || fail "first sync accounts: $(accounts)"
echo "ok adds every mailbox from SSM and skips underscore parameters"

out="$(run_sync)" || fail "second sync exited non-zero: $out"
[[ "$out" != *added* && "$out" != *removed* && "$out" != *updated* ]] || fail "unchanged sync made changes: $out"
echo "ok an unchanged SSM list changes nothing"

printf 'other@elsewhere.test|{SHA512-CRYPT}x\n' >>"$ACCOUNTS_FILE"
ssm "/example.test/mail/marcm	pw-m"
out="$(run_sync)" || fail "pruning sync exited non-zero: $out"
[[ "$out" == *"removed kirstenh@example.test"* ]] || fail "pruning sync did not report removal: $out"
[[ "$(accounts)" == "marcm@example.test other@elsewhere.test " ]] || fail "after pruning: $(accounts)"
echo "ok removes a mailbox that is gone from SSM and keeps other domains"

before="$(cat "$ACCOUNTS_FILE")"
if out="$(FAKE_SSM_FAIL=1 run_sync)"; then fail "sync succeeded although SSM failed"; fi
[[ "$out" == *"could not read mailbox passwords from SSM"* ]] || fail "SSM failure message: $out"
[[ "$(cat "$ACCOUNTS_FILE")" == "$before" ]] || fail "accounts changed although SSM failed"
echo "ok an SSM failure exits non-zero and leaves accounts untouched"

ssm "/example.test/mail/_relay	ignored"
if out="$(run_sync)"; then fail "sync succeeded with no mailboxes in SSM"; fi
[[ "$out" == *"refusing to remove any account"* ]] || fail "empty SSM message: $out"
[[ "$(cat "$ACCOUNTS_FILE")" == "$before" ]] || fail "accounts changed although SSM had no mailboxes"
echo "ok an empty SSM list removes nothing"
