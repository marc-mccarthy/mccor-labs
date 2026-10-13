#!/usr/bin/env bash
set -euo pipefail
script="$(dirname "$0")/eval-cap.sh"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

runs() {
  jq -n --argjson n "$1" --arg branch "${2:-main}" \
    '{workflow_runs: [range(0; $n) | {id: (. + 1000), head_branch: $branch}]}'
}

run() {
  set +e
  printf '%s' "$1" | bash "$script" "$2" "$3" >"$tmp/out" 2>"$tmp/err"
  code=$?
  set -e
  echo "$code"
}

assert() {
  if [ "$2" != "$3" ]; then
    echo "FAIL $1: expected '$3', got '$2'" >&2
    exit 1
  fi
}

assert "14 runs exit" "$(run "$(runs 14)" 1 1)" 0
assert "14 runs output" "$(cat "$tmp/out")" "run=true"

assert "15 runs exit" "$(run "$(runs 15)" 1 1)" 0
assert "15 runs output" "$(cat "$tmp/out")" "run=false"

assert "attempt 2 exit" "$(run "$(runs 0)" 1 2)" 1
assert "attempt 2 output" "$(cat "$tmp/out")" ""
assert "attempt 2 message" "$(cat "$tmp/err")" "Re-runs are not allowed; dispatch a new run (counted)"

own=$(runs 15 | jq '.workflow_runs[0].id = 777')
assert "own id excluded exit" "$(run "$own" 777 1)" 0
assert "own id excluded output" "$(cat "$tmp/out")" "run=true"

assert "other id counted" "$(run "$own" 888 1)" 0
assert "other id counted output" "$(cat "$tmp/out")" "run=false"

assert "non-main ignored exit" "$(run "$(runs 40 feature)" 1 1)" 0
assert "non-main ignored output" "$(cat "$tmp/out")" "run=true"

mixed=$(jq -n --argjson a "$(runs 14)" --argjson b "$(runs 5 other)" '{workflow_runs: ($a.workflow_runs + $b.workflow_runs)}')
assert "mixed branches exit" "$(run "$mixed" 1 1)" 0
assert "mixed branches output" "$(cat "$tmp/out")" "run=true"

assert "empty response exit" "$(run '{}' 1 1)" 0
assert "empty response output" "$(cat "$tmp/out")" "run=true"

echo "eval-cap tests passed"
