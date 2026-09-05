#!/usr/bin/env bash
# Enqueue ICSO Content Studio YouTube Shorts drafts to BullMQ content-video.
# Universal por canal: lee config/content-studio/channels/<channel>/batch-*.json.
# Does NOT publish to YouTube. Does NOT use Peskids branding.
#
# Usage:
#   ./scripts/content-studio-enqueue.sh --channel bitsitos --dry-run
#   ./scripts/content-studio-enqueue.sh --channel bitsitos --batch config/content-studio/channels/bitsitos/batch-02-ai-agents-games.json --dry-run
#   REDIS_URL=redis://… MONEY_PRINTER_TURBO_URL=http://gamer:8080 ./scripts/content-studio-enqueue.sh --channel bitsitos
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHANNEL="bitsitos"
DRY_RUN=0
BATCH_OVERRIDE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --channel)
      CHANNEL="${2:-bitsitos}"
      shift 2
      ;;
    --batch)
      BATCH_OVERRIDE="${2:-}"
      shift 2
      ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help)
      sed -n '2,11p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

CHANNEL_DIR="$ROOT/config/content-studio/channels/${CHANNEL}"
BATCHES=()
if [[ -n "$BATCH_OVERRIDE" ]]; then
  if [[ ! -f "$BATCH_OVERRIDE" ]]; then
    echo "Missing batch file: $BATCH_OVERRIDE" >&2
    exit 1
  fi
  BATCHES+=("$BATCH_OVERRIDE")
else
  for f in "$CHANNEL_DIR"/batch-*.json; do
    [[ -e "$f" ]] || continue
    BATCHES+=("$f")
  done
fi
if [[ ${#BATCHES[@]} -eq 0 ]]; then
  echo "No batch-*.json in $CHANNEL_DIR" >&2
  exit 1
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[dry-run] Would enqueue drafts from $(printf '%s ' "${BATCHES[@]}") to queue content-video"
  export CHANNEL_DIR
  export BATCH_OVERRIDE
  node --input-type=module <<'EOF'
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
const dir = process.env.CHANNEL_DIR;
const override = process.env.BATCH_OVERRIDE;
const files = override
  ? [override]
  : readdirSync(dir)
      .filter((x) => x.startsWith('batch-') && x.endsWith('.json'))
      .sort()
      .map((f) => join(dir, f));
for (const path of files) {
  const batch = JSON.parse(readFileSync(path, 'utf8'));
  console.log(`- ${basename(path)}: channel=${batch.channel?.brand} slug=${batch.channel?.slug} drafts=${batch.drafts?.length || 0}`);
  for (const d of batch.drafts || []) console.log(`    ${d.id}: ${d.title}`);
}
EOF
  exit 0
fi

if [[ -z "${REDIS_URL:-}" ]]; then
  echo "REDIS_URL is required to enqueue (or use --dry-run)" >&2
  exit 1
fi

export CONTENT_TENANT_SLUG="${CONTENT_TENANT_SLUG:-icso-${CHANNEL}}"
export CHANNEL_DIR
export BATCH_OVERRIDE
node --input-type=module <<'EOF'
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';

const dir = process.env.CHANNEL_DIR;
const redisUrl = process.env.REDIS_URL;
const url = new URL(redisUrl);
const connection = {
  host: url.hostname,
  port: Number(url.port || 6379),
  password: url.password ? decodeURIComponent(url.password) : undefined,
  maxRetriesPerRequest: null,
};

const queue = new Queue('content-video', { connection });
const now = new Date().toISOString();

const override = process.env.BATCH_OVERRIDE;
const batchFiles = override
  ? [override]
  : readdirSync(dir)
      .filter((f) => f.startsWith('batch-') && f.endsWith('.json'))
      .sort()
      .map((file) => join(dir, file));

for (const batchPath of batchFiles) {
  const batch = JSON.parse(readFileSync(batchPath, 'utf8'));
  const preset = batch.preset;
  const channelKey = process.env.CHANNEL_DIR.split('/').pop();
  for (const item of batch.drafts || []) {
    const request_id = randomUUID();
    const draft = {
      id: item.id,
      tenant_slug: process.env.CONTENT_TENANT_SLUG,
      event_id: `manual:${item.id}`,
      title: item.title,
      story_hook: item.story_hook,
      captions: [
        {
          platform: 'youtube_shorts',
          text: `${item.story_hook}\n\n${item.call_to_action}`,
          hashtags: item.hashtags,
          characterCount: `${item.story_hook}\n\n${item.call_to_action}`.length,
        },
      ],
      image_prompt: item.image_prompt,
      reel_script: item.reel_script,
      call_to_action: item.call_to_action,
      compliance_flags: ['not_peskids', 'icso_owned', channelKey],
      state: 'approved',
      created_at: now,
      approved_at: now,
      approved_by: `${channelKey}-batch`,
      copy_paste_kit: {
        instagram_caption: item.story_hook,
        facebook_caption: item.story_hook,
        linkedin_caption: item.story_hook,
        x_caption: item.story_hook,
        tiktok_script: item.youtube_shorts_script,
        youtube_shorts_script: item.youtube_shorts_script,
      },
    };

    const job = await queue.add(
      'render',
      {
        tenant_slug: process.env.CONTENT_TENANT_SLUG,
        request_id,
        draft_id: item.id,
        draft,
        preset,
        mpt_base_url: process.env.MONEY_PRINTER_TURBO_URL,
        mpt_api_key: process.env.MONEY_PRINTER_TURBO_API_KEY,
      },
      {
        jobId: `${channelKey}:${item.id}`,
        removeOnComplete: 100,
        removeOnFail: 50,
      }
    );
    console.log(`enqueued ${item.id} job=${job.id}`);
  }
}

await queue.close();
console.log('done');
EOF