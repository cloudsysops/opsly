#!/usr/bin/env bash
# Prepare / optionally upload ICSO Content Studio Shorts to YouTube.
# Default is approval-first: writes an upload kit. --upload needs OAuth env.
#
# Usage:
#   ./scripts/content-studio-publish-youtube.sh --channel bitsitos --dry-run
#   ./scripts/content-studio-publish-youtube.sh --channel bitsitos --kit
#   ./scripts/content-studio-publish-youtube.sh --channel bitsitos --upload   # requires YOUTUBE_* secrets
#   ./scripts/content-studio-publish-youtube.sh --channel bitsitos --upload --limit 1
#
# Env (Doppler / local; never commit):
#   YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN  (OAuth upload)
#   YOUTUBE_BITSITOS_CHANNEL_ID / YOUTUBE_SPLASHITOS_CHANNEL_ID
#   YOUTUBE_PRIVACY=unlisted|private|public   (default: unlisted)
#   YOUTUBE_MADE_FOR_KIDS=false              (default false = for parents teaching kids)
#   CONTENT_STUDIO_RENDERS_DIR=runtime/content-studio/renders
#
# OAuth one-shot → Doppler: ./scripts/youtube-oauth-doppler-setup.sh --client-json …
# Runbook: docs/brand/icso/YOUTUBE-DOPPLER-MONETIZATION.md
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CHANNEL="bitsitos"
MODE="kit"
LIMIT="0"
ORDER_FILE="$ROOT/config/content-studio/youtube-publish-plan.json"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --channel)
      CHANNEL="${2:-bitsitos}"
      shift 2
      ;;
    --dry-run) MODE="dry-run"; shift ;;
    --kit) MODE="kit"; shift ;;
    --upload) MODE="upload"; shift ;;
    --limit)
      LIMIT="${2:-0}"
      shift 2
      ;;
    --order-file)
      ORDER_FILE="${2:-$ROOT/config/content-studio/youtube-publish-plan.json}"
      shift 2
      ;;
    -h|--help)
      sed -n '2,24p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

export CONTENT_STUDIO_CHANNEL="$CHANNEL"
export CONTENT_STUDIO_RENDERS_DIR="${CONTENT_STUDIO_RENDERS_DIR:-$ROOT/runtime/content-studio/renders}"
export CONTENT_STUDIO_CHANNEL_DIR="$ROOT/config/content-studio/channels/${CHANNEL}"
export CONTENT_STUDIO_KIT_DIR="$ROOT/runtime/content-studio/youtube-upload-kit/${CHANNEL}"
export YOUTUBE_PRIVACY="${YOUTUBE_PRIVACY:-unlisted}"
export YOUTUBE_MADE_FOR_KIDS="${YOUTUBE_MADE_FOR_KIDS:-false}"
export YOUTUBE_DEFAULT_CATEGORY_ID="${YOUTUBE_DEFAULT_CATEGORY_ID:-27}"
export CONTENT_STUDIO_CHANNELS_JSON="${CONTENT_STUDIO_CHANNELS_JSON:-$ROOT/config/content-studio/youtube-channels.json}"
export CONTENT_STUDIO_PUBLISH_LIMIT="$LIMIT"
export CONTENT_STUDIO_PUBLISH_ORDER_FILE="$ORDER_FILE"
export MODE

if [[ ! -d "$CONTENT_STUDIO_CHANNEL_DIR" ]]; then
  echo "Missing channel dir: $CONTENT_STUDIO_CHANNEL_DIR" >&2
  exit 1
fi
mkdir -p "$CONTENT_STUDIO_KIT_DIR"

node --input-type=module <<'EOF'
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';

const mode = process.env.MODE;
const channelKey = process.env.CONTENT_STUDIO_CHANNEL || 'bitsitos';
const channelDir = process.env.CONTENT_STUDIO_CHANNEL_DIR;
const publishLimit = Number.parseInt(process.env.CONTENT_STUDIO_PUBLISH_LIMIT || '0', 10) || 0;
const publishOrderFile = process.env.CONTENT_STUDIO_PUBLISH_ORDER_FILE;

let channelMeta = {};
const channelsJsonPath = process.env.CONTENT_STUDIO_CHANNELS_JSON;
if (channelsJsonPath && existsSync(channelsJsonPath)) {
  const all = JSON.parse(readFileSync(channelsJsonPath, 'utf8'));
  channelMeta = all.channels?.[channelKey] || {};
}
const envChannelIdKey = `YOUTUBE_${channelKey.toUpperCase()}_CHANNEL_ID`;
const youtubeChannelId =
  process.env[envChannelIdKey]?.trim() ||
  channelMeta.youtube_channel_id ||
  '';
const categoryId = process.env.YOUTUBE_DEFAULT_CATEGORY_ID || '27';

const batchFiles = readdirSync(channelDir)
  .filter((f) => f.startsWith('batch-') && f.endsWith('.json'))
  .sort();
if (batchFiles.length === 0) {
  console.error('No batch-*.json in', channelDir);
  process.exit(1);
}

let brand = process.env.CONTENT_STUDIO_CHANNEL;
const drafts = [];
for (const f of batchFiles) {
  const batch = JSON.parse(readFileSync(join(channelDir, f), 'utf8'));
  brand = batch.channel?.brand || brand;
  for (const d of batch.drafts || []) drafts.push(d);
}

let publishOrder = [];
if (publishOrderFile && existsSync(publishOrderFile)) {
  try {
    const config = JSON.parse(readFileSync(publishOrderFile, 'utf8'));
    const byChannel =
      config.channels?.[channelKey]?.publish_order_today ||
      config[channelKey]?.publish_order_today ||
      config.publish_order_today ||
      [];
    if (Array.isArray(byChannel)) {
      publishOrder = byChannel.filter((id) => typeof id === 'string');
    }
  } catch (error) {
    console.warn(`publish order file unreadable: ${publishOrderFile}`, error?.message || error);
  }
}
const publishRank = new Map(publishOrder.map((id, index) => [id, index]));

const rendersDir = process.env.CONTENT_STUDIO_RENDERS_DIR;
const kitDir = process.env.CONTENT_STUDIO_KIT_DIR;
const privacy = process.env.YOUTUBE_PRIVACY || 'unlisted';
const madeForKids = String(process.env.YOUTUBE_MADE_FOR_KIDS || 'false') === 'true';

const mp4s = existsSync(rendersDir)
  ? readdirSync(rendersDir).filter((f) => f.endsWith('.mp4'))
  : [];

function findMp4(draftId) {
  const matches = mp4s.filter((f) => f.startsWith(draftId));
  matches.sort(
    (a, b) =>
      statSync(join(rendersDir, b)).mtimeMs - statSync(join(rendersDir, a)).mtimeMs ||
      statSync(join(rendersDir, b)).size - statSync(join(rendersDir, a)).size
  );
  return matches[0] || null;
}

const items = drafts.map((d) => {
  const file = findMp4(d.id);
  const description = [
    d.story_hook,
    '',
    d.call_to_action,
    '',
    (d.hashtags || []).join(' '),
    '',
    `Canal: ${brand} (ICSO). No afiliado a Peskids.`,
  ].join('\n');
  return {
    draft_id: d.id,
    title: d.title.slice(0, 95),
    description,
    tags: (d.hashtags || []).map((h) => h.replace(/^#/, '')),
    categoryId,
    privacyStatus: privacy,
    selfDeclaredMadeForKids: madeForKids,
    youtube_channel_id: youtubeChannelId || null,
    mp4: file ? join(rendersDir, file) : null,
    mp4_name: file,
    publish_rank: publishRank.has(d.id) ? publishRank.get(d.id) : Number.MAX_SAFE_INTEGER,
    source_index: drafts.findIndex((item) => item.id === d.id),
  };
});

const orderedItems = items
  .slice()
  .sort(
    (a, b) =>
      a.publish_rank - b.publish_rank ||
      a.source_index - b.source_index
  );
const selectedItems = publishLimit > 0 ? orderedItems.slice(0, publishLimit) : orderedItems;
const publishItems = selectedItems.map(({ publish_rank, ...item }) => item);

console.log(
  `mode=${mode} channel=${channelKey} youtube_channel_id=${youtubeChannelId || '(unset)'} renders=${mp4s.length} drafts=${items.length} selected=${publishItems.length}${publishLimit > 0 ? ` limit=${publishLimit}` : ''}`
);
for (const it of publishItems) {
  console.log(`- ${it.draft_id}: ${it.mp4_name || 'MISSING mp4'} | ${it.title}`);
}

if (mode === 'dry-run') {
  if (mp4s.length === 0) console.warn('no mp4 renders yet'); process.exit(0);
}

mkdirSync(kitDir, { recursive: true });
const manifest = {
  channel: brand,
  channel_key: channelKey,
  youtube_channel_id: youtubeChannelId || null,
  studio_url: channelMeta.studio_url || null,
  owner: 'icso',
  not_peskids: true,
  batches: batchFiles,
  created_at: new Date().toISOString(),
  privacy,
  made_for_kids: madeForKids,
  category_id: categoryId,
  publish_order_file: publishOrderFile || null,
  publish_limit: publishLimit,
  publish_order: publishOrder,
  items: publishItems,
};
writeFileSync(join(kitDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

for (const it of publishItems) {
  if (!it.mp4) continue;
  const dest = join(kitDir, it.mp4_name);
  copyFileSync(it.mp4, dest);
  writeFileSync(
    join(kitDir, `${it.draft_id}.txt`),
    `TITLE:\n${it.title}\n\nDESCRIPTION:\n${it.description}\n\nTAGS:\n${it.tags.join(', ')}\n\nPRIVACY: ${privacy}\nMADE_FOR_KIDS: ${madeForKids}\n`
  );
}

console.log(`kit written → ${kitDir}`);

if (mode !== 'upload') {
  process.exit(0);
}

const clientId = process.env.YOUTUBE_CLIENT_ID?.trim();
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim();
const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN?.trim();
if (!clientId || !clientSecret || !refreshToken) {
  console.error('Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN');
  process.exit(1);
}

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) {
    throw new Error(`token refresh failed: ${resp.status} ${await resp.text()}`);
  }
  const data = await resp.json();
  return data.access_token;
}

async function uploadVideo(accessToken, item) {
  if (!item.mp4 || !existsSync(item.mp4)) {
    throw new Error(`missing mp4 for ${item.draft_id}`);
  }
  const { readFileSync: read } = await import('node:fs');
  const media = read(item.mp4);
  const metadata = {
    snippet: {
      title: item.title,
      description: item.description,
      tags: item.tags,
      categoryId: item.categoryId,
    },
    status: {
      privacyStatus: item.privacyStatus,
      selfDeclaredMadeForKids: item.selfDeclaredMadeForKids,
    },
  };

  const init = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json; charset=UTF-8',
        'x-upload-content-type': 'video/mp4',
        'x-upload-content-length': String(media.byteLength),
      },
      body: JSON.stringify(metadata),
    }
  );
  if (!init.ok) {
    throw new Error(`init upload failed ${item.draft_id}: ${init.status} ${await init.text()}`);
  }
  const location = init.headers.get('location');
  if (!location) throw new Error('missing upload location header');

  const put = await fetch(location, {
    method: 'PUT',
    headers: {
      'content-type': 'video/mp4',
      'content-length': String(media.byteLength),
    },
    body: media,
  });
  if (!put.ok) {
    throw new Error(`upload put failed ${item.draft_id}: ${put.status} ${await put.text()}`);
  }
  const result = await put.json();
  console.log(`uploaded ${item.draft_id} → https://youtu.be/${result.id}`);
  return result.id;
}

const token = await getAccessToken();
const results = [];
for (const it of publishItems) {
  if (!it.mp4) {
    console.warn(`skip ${it.draft_id}: no mp4`);
    continue;
  }
  const id = await uploadVideo(token, it);
  results.push({ draft_id: it.draft_id, youtube_id: id });
}
writeFileSync(join(kitDir, 'upload-results.json'), JSON.stringify(results, null, 2));
console.log(`uploaded ${results.length} videos`);
EOF
