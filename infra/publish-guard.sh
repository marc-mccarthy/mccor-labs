#!/usr/bin/env bash

publish_guard_reject() {
  echo "publish guard: $1: $2; allowed extensions are set in infra/publish-guard.sh" >&2
  failed=1
}

check_publish_stage() {
  local stage="$1" root="$2" failed=0 rejected="" ignored file name
  if [[ -d "$root/rejected-media" ]]; then
    rejected="$(find "$root/rejected-media" -type f -exec basename {} \;)" || return 1
  fi
  find "$stage" ! -type d >/dev/null || return 1

  while IFS= read -r -d '' file; do
    name="${file##*/}"
    if [[ -L "$file" ]]; then
      publish_guard_reject "${file#"$stage"/}" "symlink"
    elif [[ "$name" == .* ]]; then
      publish_guard_reject "${file#"$stage"/}" "dotfile"
    elif [[ "${file#"$stage"/}" == "apple-touch-icon.png" || "${file#"$stage"/}" == "favicon.ico" ]]; then
      :
    else
      case "$name" in
        *.html | *.txt | *.js | *.css | *.json | *.xml | *.woff2 | *.webp | *.avif | *.jpg | *.svg | *.mp4 | *.webm | *.glsl) ;;
        *) publish_guard_reject "${file#"$stage"/}" "extension not allowed" ;;
      esac
    fi
    if [[ -n "$rejected" ]] && grep -qxF -- "$name" <<<"$rejected"; then
      publish_guard_reject "${file#"$stage"/}" "same name as a file in rejected-media/"
    fi
  done < <(find "$stage" ! -type d -print0)

  if ! ignored="$(git -C "$root" ls-files --others --ignored --exclude-standard -- app/web/public)"; then
    echo "publish guard: git ls-files failed in $root" >&2
    return 1
  fi
  while IFS= read -r file; do
    if [[ -n "$file" ]]; then
      publish_guard_reject "$file" "git-ignored file under app/web/public"
    fi
  done <<<"$ignored"

  return "$failed"
}
