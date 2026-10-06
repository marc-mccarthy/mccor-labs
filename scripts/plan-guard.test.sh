#!/usr/bin/env bash
set -euo pipefail
guard="$(dirname "$0")/plan-guard.sh"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
: >"$tmp/empty.txt"
echo "aws_s3_bucket.this" >"$tmp/allow.txt"

delete='{"resource_changes":[{"address":"aws_s3_bucket.this","change":{"actions":["delete"]}}]}'
replace='{"resource_changes":[{"address":"aws_rds_cluster.this","change":{"actions":["delete","create"]}}]}'

run() {
  set +e
  printf '%s' "$1" | bash "$guard" "$2" >/dev/null 2>&1
  code=$?
  set -e
  echo "$code"
}

assert() {
  if [ "$2" != "$3" ]; then
    echo "FAIL $1: expected exit $3, got $2" >&2
    exit 1
  fi
}

assert "delete outside allowlist" "$(run "$delete" "$tmp/empty.txt")" 1
assert "delete inside allowlist" "$(run "$delete" "$tmp/allow.txt")" 0
assert "replace outside allowlist" "$(run "$replace" "$tmp/allow.txt")" 1
assert "no resource_changes" "$(run '{}' "$tmp/empty.txt")" 0
