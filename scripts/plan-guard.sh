#!/usr/bin/env bash
set -euo pipefail
allow="${1:?allowlist path}"
changed=$(jq -r '.resource_changes[]? | select(.change.actions | index("delete")) | .address')
bad=$(comm -23 <(printf '%s\n' "$changed" | sort -u) <(sort -u "$allow"))
if [ -n "$bad" ]; then
  echo "::error::plan deletes or replaces resources outside the allowlist:" >&2
  echo "$bad" >&2
  exit 1
fi
