#!/usr/bin/env bash
# Apply YouTube channel branding for Content Studio (banner + About).
# Avatar cannot be set via YouTube Data API — Studio only.
# Secrets: Doppler YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN.
#
# Usage:
#   ./scripts/content-studio-youtube-brand.sh --channel opsly --dry-run
#   doppler run --project ops-intcloudsysops --config prd -- \
#     ./scripts/content-studio-youtube-brand.sh --channel opsly
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CHANNEL="opsly"
DRY_RUN=0
SKIP_BANNER=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --channel)
      CHANNEL="${2:-opsly}"
      shift 2
      ;;
    --dry-run) DRY_RUN=1; shift ;;
    --skip-banner) SKIP_BANNER=1; shift ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

export CONTENT_STUDIO_BRAND_CHANNEL="$CHANNEL"
export CONTENT_STUDIO_BRAND_SKIP_BANNER="$SKIP_BANNER"
export ROOT

if [[ "$DRY_RUN" -eq 1 ]]; then
  node --input-type=module <<'EOF'
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const { loadChannelBrandPayload, summarizeBrandDryRun } = await import(
  pathToFileURL(join(process.env.ROOT, 'scripts/ops/content-studio-youtube-brand.mjs')).href
);
const payload = loadChannelBrandPayload(process.env.ROOT, process.env.CONTENT_STUDIO_BRAND_CHANNEL);
console.log(JSON.stringify(summarizeBrandDryRun(payload), null, 2));
EOF
  exit 0
fi

if [[ -z "${YOUTUBE_CLIENT_ID:-}" || -z "${YOUTUBE_CLIENT_SECRET:-}" || -z "${YOUTUBE_REFRESH_TOKEN:-}" ]]; then
  echo "Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN (use doppler run)" >&2
  exit 1
fi

node --input-type=module <<'EOF'
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const { applyYoutubeChannelBrand, loadChannelBrandPayload, refreshYoutubeAccessToken } = await import(
  pathToFileURL(join(process.env.ROOT, 'scripts/ops/content-studio-youtube-brand.mjs')).href
);
const payload = loadChannelBrandPayload(process.env.ROOT, process.env.CONTENT_STUDIO_BRAND_CHANNEL);
const accessToken = await refreshYoutubeAccessToken(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REFRESH_TOKEN
);
const result = await applyYoutubeChannelBrand({
  accessToken,
  payload,
  applyBanner: process.env.CONTENT_STUDIO_BRAND_SKIP_BANNER !== '1',
});
console.log(JSON.stringify(result, null, 2));
console.log('avatar: YouTube Data API cannot set the profile picture — upload in Studio if still default');
EOF
