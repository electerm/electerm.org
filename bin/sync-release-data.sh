#!/usr/bin/env bash
#
# bin/sync-release-data.sh
#
# Replaces the multi-step "Fetch base release data (on electerm-release
# dispatch)" block that used to live in .github/workflows/deploy-on-release.yml.
#
# Instead of gating on `github.event_name == 'repository_dispatch'`, this
# script checks (independently / "standalone") whether the LATEST release tag
# of EACH repo is already present in its data dir:
#   - src/release-data/<desktop-tag>.json          (desktop release)
#   - src/release-data-android/<android-tag>.json  (android apk assets)
#
# The two checks are fully independent, so every situation is handled:
#   - electerm desktop released, android not yet  -> fetch desktop only
#   - electerm-android released (standalone), no new desktop -> fetch android only
#   - both released                                -> fetch both
#   - GitHub API unreachable / no token / rate limit -> skip safely, no push
#
# For whichever tag is missing we download it, then (only if something
# changed) commit + push. The commit message carries `[skip ci]` so the
# resulting push does not re-trigger a redundant build. Idempotent and safe to
# run on EVERY CI run (push to master OR repository_dispatch).

set -euo pipefail

# Resolve repo root (parent of bin/).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DATA_DIR="src/release-data"
ANDROID_DIR="src/release-data-android"

API_BASE="https://api.github.com/repos/electerm"
CURL_HEADERS=(-sS -H "Accept: application/vnd.github+json" -H "User-Agent: electerm.org-release-sync")
if [ -n "${GITHUB_TOKEN:-}" ]; then
  CURL_HEADERS+=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
fi

# Parse tag_name out of a GitHub release JSON payload (avoids a jq dependency).
parse_tag () {
  printf '%s' "$1" | node -e '
    let s = "";
    process.stdin.on("data", d => { s += d; });
    process.stdin.on("end", () => {
      try { process.stdout.write(JSON.parse(s).tag_name || ""); }
      catch (e) { process.stdout.write(""); }
    });
  '
}

echo "→ Querying latest release tags from GitHub…"
DESKTOP_RESP="$(curl "${CURL_HEADERS[@]}" "$API_BASE/electerm/releases/latest" || true)"
ANDROID_RESP="$(curl "${CURL_HEADERS[@]}" "$API_BASE/electerm-android/releases/latest" || true)"

DESKTOP_TAG="$(parse_tag "$DESKTOP_RESP")"
ANDROID_TAG="$(parse_tag "$ANDROID_RESP")"

if [ -z "$DESKTOP_TAG" ] && [ -z "$ANDROID_TAG" ]; then
  echo "⚠️  Could not determine any latest release tag (API error / rate limit / no token). Skipping sync."
  exit 0
fi

[ -n "$DESKTOP_TAG" ] && echo "→ Latest desktop tag: ${DESKTOP_TAG}"
[ -n "$ANDROID_TAG" ] && echo "→ Latest android tag:  ${ANDROID_TAG}"

need_fetch=0

# --- Desktop check (standalone) --------------------------------------------
if [ -n "$DESKTOP_TAG" ]; then
  if [ ! -f "$DATA_DIR/$DESKTOP_TAG.json" ]; then
    echo "→ Desktop release $DESKTOP_TAG missing locally."
    need_fetch=1
  fi
else
  echo "⚠️  Skipping desktop check (latest desktop tag unavailable)."
fi

# --- Android check (standalone) --------------------------------------------
if [ -n "$ANDROID_TAG" ]; then
  if [ ! -f "$ANDROID_DIR/$ANDROID_TAG.json" ]; then
    echo "→ Android release $ANDROID_TAG missing locally."
    need_fetch=1
  fi
else
  echo "⚠️  Skipping android check (latest android tag unavailable)."
fi

if [ "$need_fetch" -eq 0 ]; then
  echo "✅ All latest release data already present — nothing to do."
  exit 0
fi

echo "→ Fetching missing release data…"

# Fetch only what is actually missing.
if [ -n "$DESKTOP_TAG" ] && [ ! -f "$DATA_DIR/$DESKTOP_TAG.json" ]; then
  node bin/fetch-release-json.js
fi

if [ -n "$ANDROID_TAG" ] && [ ! -f "$ANDROID_DIR/$ANDROID_TAG.json" ]; then
  node bin/fetch-android.js "$ANDROID_TAG"
fi

# --- Commit & push only if something actually changed ----------------------
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

git add src/release-data src/release-data-android

if git diff --cached --quiet; then
  echo "ℹ️  Fetched data but nothing new to commit (e.g. android build not released yet for ${ANDROID_TAG:-<tag>})."
  exit 0
fi

git commit -m "chore: sync latest release data [skip ci]"
git push

echo "✅ Pushed updated release data."
