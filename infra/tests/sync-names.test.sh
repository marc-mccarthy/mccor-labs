#!/usr/bin/env bash
set -euo pipefail

TEMPLATE="$(dirname "$0")/../modules/mailserver/templates/setup.sh.tftpl"
BASE="$(mktemp -d)"
trap 'rm -rf "$BASE"' EXIT

# shellcheck disable=SC2016
awk "/^cat > \/opt\/mail\/sync-names.sh <<'NAMES'$/ { on = 1; next } /^NAMES$/ { on = 0 } on" "$TEMPLATE" |
  sed -e 's/\${domain}/example.test/g' \
    -e 's/\${region}/us-east-1/g' \
    -e 's#\${param_prefix}#/example.test/mail#g' \
    -e 's/\$\${/${/g' >"$BASE/sync-names.sh"
chmod +x "$BASE/sync-names.sh"
[[ -s "$BASE/sync-names.sh" ]] || { echo "FAIL sync-names.sh not found in template" >&2; exit 1; }

mkdir -p "$BASE/bin"
cat >"$BASE/bin/aws" <<'AWS'
#!/usr/bin/env bash
[[ "${FAKE_SSM_FAIL:-}" == 1 ]] && { echo "AccessDenied" >&2; exit 255; }
printf '%s\n' "$*" >"$FAKE_AWS_ARGS"
cat "$FAKE_SSM"
AWS
cat >"$BASE/bin/docker" <<'DOCKER'
#!/usr/bin/env bash
case "$1" in
  ps) echo mailserver ;;
  exec) echo "$*" >>"$FAKE_DOCKER_LOG" ;;
esac
DOCKER
chmod +x "$BASE/bin/aws" "$BASE/bin/docker"

export NAMES_FILE="$BASE/sender-names.cf"
export FAKE_SSM="$BASE/ssm.txt"
export FAKE_AWS_ARGS="$BASE/aws-args.txt"
export FAKE_DOCKER_LOG="$BASE/docker.log"
: >"$FAKE_DOCKER_LOG"

ssm() {
  printf '%s\n' "$@" >"$FAKE_SSM"
}

run_sync() {
  PATH="$BASE/bin:$PATH" "$BASE/sync-names.sh" 2>&1
}

rewrite() {
  local header="$1" pattern replacement line
  while IFS= read -r line; do
    pattern="${line#/}"
    pattern="${pattern%%/ REPLACE *}"
    replacement="${line#* REPLACE }"
    if printf '%s\n' "$header" | grep -Eiq -- "$pattern"; then
      printf '%s' "$replacement"
      return
    fi
  done <"$NAMES_FILE"
  printf '%s' "$header"
}

fail() {
  echo "FAIL $1" >&2
  exit 1
}

ssm "/example.test/mail/_names/marcm	Marc McCarthy" "/example.test/mail/_names/mariem	Marie Mohaven"
out="$(run_sync)" || fail "first sync exited non-zero: $out"
[[ "$(cat "$FAKE_AWS_ARGS")" == *"--path /example.test/mail/_names"* ]] || fail "reads the wrong SSM path: $(cat "$FAKE_AWS_ARGS")"
[[ "$(grep -c REPLACE "$NAMES_FILE")" == 2 ]] || fail "expected 2 rules: $(cat "$NAMES_FILE")"
[[ "$(cat "$FAKE_DOCKER_LOG")" == *"postfix reload"* ]] || fail "changed names did not reload postfix"
echo "ok writes one rule per mailbox and reloads postfix"

want='From: "Marc McCarthy" <marcm@example.test>'
for header in \
  'From: marcm@example.test' \
  'From: <marcm@example.test>' \
  'From: Marc M <marcm@example.test>' \
  'From: "Someone Else" <MarcM@Example.Test>'; do
  [[ "$(rewrite "$header")" == "$want" ]] || fail "did not rewrite '$header': $(rewrite "$header")"
done
echo "ok rewrites every From form of the address"

for header in \
  'From: xmarcm@example.test' \
  'From: marcm@example.test.evil.test' \
  'From: marcmx@example.test' \
  'From: marcm@exampleXtest' \
  'From: Marc <marcm@other.test>' \
  'Reply-To: marcm@example.test'; do
  [[ "$(rewrite "$header")" == "$header" ]] || fail "rewrote '$header' to $(rewrite "$header")"
done
echo "ok leaves other addresses and headers alone"

: >"$FAKE_DOCKER_LOG"
out="$(run_sync)" || fail "second sync exited non-zero: $out"
[[ ! -s "$FAKE_DOCKER_LOG" ]] || fail "unchanged names reloaded postfix"
echo "ok unchanged names change nothing"

ssm "/example.test/mail/_names/marcm	Marc \"Evil\" <x@evil.test>" "/example.test/mail/_names/nateb	Nate Best"
out="$(run_sync)" || fail "sync with a bad name exited non-zero: $out"
[[ "$out" == *"WARNING"*"marcm"* ]] || fail "bad name was not reported: $out"
grep -q 'marcm' "$NAMES_FILE" && fail "bad name was written: $(cat "$NAMES_FILE")"
grep -q '"Nate Best" <nateb@example.test>' "$NAMES_FILE" || fail "good name was dropped: $(cat "$NAMES_FILE")"
echo "ok skips a display name with unsafe characters and keeps the rest"

before="$(cat "$NAMES_FILE")"
if out="$(FAKE_SSM_FAIL=1 run_sync)"; then fail "sync succeeded although SSM failed"; fi
[[ "$(cat "$NAMES_FILE")" == "$before" ]] || fail "names changed although SSM failed"
echo "ok an SSM failure leaves the names file unchanged"

rm -f "$NAMES_FILE"
ssm ""
out="$(run_sync)" || fail "empty sync exited non-zero: $out"
[[ -f "$NAMES_FILE" && ! -s "$NAMES_FILE" ]] || fail "no names should leave an empty file"
echo "ok no names leaves an empty rules file"

mkdir -p "$BASE/dms"
# shellcheck disable=SC2016
awk "/^cat > \/var\/mail-data\/config\/user-patches.sh <<'PATCHES'$/ { on = 1; next } /^PATCHES$/ { on = 0 } on" "$TEMPLATE" |
  sed -e 's/\$\${/${/g' -e "s#/tmp/docker-mailserver#$BASE/dms#g" >"$BASE/user-patches.sh"
grep -q postconf "$BASE/user-patches.sh" || fail "user-patches.sh not found in template"
cat >"$BASE/bin/postconf" <<'POSTCONF'
#!/usr/bin/env bash
case "$1" in
  -Ph) cat "$FAKE_HEADER_CHECKS" ;;
  -P) printf '%s' "${2#sender-cleanup/unix/header_checks=}" >"$FAKE_HEADER_CHECKS" ;;
esac
POSTCONF
chmod +x "$BASE/bin/postconf"
export FAKE_HEADER_CHECKS="$BASE/header_checks"
printf 'pcre:/etc/postfix/maps/sender_header_filter.pcre' >"$FAKE_HEADER_CHECKS"
PATH="$BASE/bin:$PATH" bash "$BASE/user-patches.sh"
PATH="$BASE/bin:$PATH" bash "$BASE/user-patches.sh"
[[ "$(cat "$FAKE_HEADER_CHECKS")" == "pcre:/etc/postfix/maps/sender_header_filter.pcre,regexp:$BASE/dms/sender-names.cf" ]] ||
  fail "header_checks after two boots: $(cat "$FAKE_HEADER_CHECKS")"
[[ -f "$BASE/dms/sender-names.cf" ]] || fail "patch did not create the rules file"
echo "ok the patch adds the names table to sender-cleanup once and keeps the DMS filter"
