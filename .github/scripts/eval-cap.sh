#!/usr/bin/env bash
set -euo pipefail
run_id="${1:?run id}"
attempt="${2:?run attempt}"
cap="${MONTHLY_RUN_CAP:-15}"
if [ "$attempt" != "1" ]; then
  echo "Re-runs are not allowed; dispatch a new run (counted)" >&2
  exit 1
fi
used=$(jq --arg id "$run_id" '[.workflow_runs[]? | select((.id | tostring) != $id and .head_branch == "main")] | length')
echo "Eval runs this month before this one: $used of $cap" >&2
if [ "$used" -ge "$cap" ]; then
  echo "::warning::Eval cap reached ($used runs this month); no AWS call made" >&2
  echo "run=false"
else
  echo "run=true"
fi
