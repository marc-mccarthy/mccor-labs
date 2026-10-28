#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/../publish-guard.sh"

BASE="$(mktemp -d)"
trap 'rm -rf "$BASE"' EXIT

fixture() {
  STAGE="$(mktemp -d "$BASE/stage.XXXXXX")"
  ROOT="$(mktemp -d "$BASE/root.XXXXXX")"
  git init -q "$ROOT"
  mkdir -p "$ROOT/rejected-media" "$ROOT/app/web/public" \
    "$STAGE/media/brand" "$STAGE/_next/static/chunks"
  touch "$STAGE/index.html" "$STAGE/media/brand/hero.webp" "$STAGE/_next/static/chunks/a.js"
}

expect() {
  local name="$1" want="$2" needle="${3:-}" got=0 err
  err="$(check_publish_stage "$STAGE" "$ROOT" 2>&1)" || got=$?
  if [[ "$got" != "$want" ]]; then
    echo "FAIL $name: exit $got, want $want: $err" >&2
    exit 1
  fi
  if [[ -n "$needle" && "$err" != *"$needle"* ]]; then
    echo "FAIL $name: message lacks '$needle': $err" >&2
    exit 1
  fi
  echo "ok $name"
}

fixture
expect "clean stage" 0

fixture
touch "$STAGE/media/brand/.DS_Store"
expect "dotfile" 1 ".DS_Store"

fixture
touch "$STAGE/a.psd"
expect "extension outside the allow-list" 1 "allowed extensions"

fixture
touch "$ROOT/rejected-media/ai-neural.webp" "$STAGE/media/brand/ai-neural.webp"
expect "basename in rejected-media" 1 "ai-neural.webp"

fixture
touch "$ROOT/rejected-media/ai-neural.webp" "$STAGE/media/brand/ai-neural.1a2b3c4d.webp"
expect "hashed media name in rejected-media" 1 "ai-neural.1a2b3c4d.webp"

fixture
touch "$ROOT/rejected-media/b.js" "$STAGE/_next/static/chunks/b.1a2b3c4d.js"
expect "hash kept outside media and fonts" 0

fixture
echo "*.env" > "$ROOT/.gitignore"
touch "$ROOT/app/web/public/secret.env"
expect "ignored file under app/web/public" 1 "app/web/public/secret.env"

fixture
touch "$STAGE/apple-touch-icon.png" "$STAGE/favicon.ico"
expect "root touch icon and favicon" 0

fixture
touch "$STAGE/media/brand/apple-touch-icon.png"
expect "png outside the root icon" 1 "media/brand/apple-touch-icon.png: extension not allowed"

fixture
touch "$STAGE/media/brand/favicon.ico"
expect "ico outside the root favicon" 1 "media/brand/favicon.ico: extension not allowed"

fixture
mkdir -p "$STAGE/sig"
touch "$STAGE/sig/name-marcm.png" "$STAGE/sig/scene.gif" "$STAGE/sig/photo-marcm.jpg"
expect "email signature images under sig" 0

fixture
touch "$STAGE/media/brand/scene.gif"
expect "gif outside sig" 1 "media/brand/scene.gif: extension not allowed"

mkdir -p "$STAGE/media/audio"
touch "$STAGE/media/audio/mccor-ambient-loop.c93bf064.mp3"
expect "mp3 under media/audio" 0
rm -f "$STAGE/media/audio/mccor-ambient-loop.c93bf064.mp3"

fixture
mkdir -p "$STAGE/sig/nested"
touch "$STAGE/sig/nested/a.png"
expect "png nested below sig" 1 "sig/nested/a.png: extension not allowed"

fixture
touch "$STAGE/media/brand/._hero.webp"
expect "dotfile with an allowed extension" 1 "._hero.webp: dotfile"

fixture
touch "$STAGE/media/brand/json"
expect "bare extension name" 1 "media/brand/json: extension not allowed"

fixture
ln -s /etc/hosts "$STAGE/hosts.txt"
expect "symlink to a file" 1 "hosts.txt: symlink"

fixture
ln -s "$BASE" "$STAGE/vendor.js"
expect "symlink to a directory" 1 "vendor.js: symlink"

fixture
touch "$ROOT/rejected-media/mccor-stag-og.jpg" "$STAGE/og.jpg"
expect "rejected name matched whole, not as a substring" 0

fixture
STAGE="$BASE/missing"
expect "missing stage" 1

fixture
rm -rf "$ROOT/.git"
expect "git failure" 1 "git ls-files failed"

echo "PASS"
