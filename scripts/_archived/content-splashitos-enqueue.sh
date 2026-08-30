#!/usr/bin/env bash
# Enqueue Splashitos (ICSO) YouTube Shorts drafts to BullMQ content-video.
# Does NOT publish to YouTube. Does NOT use Peskids branding.
#
# Usage:
#   ./scripts/content-splashitos-enqueue.sh --dry-run
#   ./scripts/content-splashitos-enqueue.sh
#   REDIS_URL=redis://… MONEY_PRINTER_TURBO_URL=http://gamer:8080 ./scripts/content-splashitos-enqueue.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BATCH="$ROOT/config/content-studio/channels/splashitos/batch-01-scripts.json"
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$BATCH" ]]; then
  echo "Missing batch file: $BATCH" >&2
  exit 1
fi

export BATCH_PATH="$BATCH"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[dry-run] Would enqueue drafts from $BATCH to queue content-video"
  node --input-type=module <<'EOF'
import { readFileSync } from 'node:fs';
const batch = JSON.parse(readFileSync(process.env.BATCH_PATH, 'utf8'));
console.log(`channel=${batch.channel.brand} slug=${batch.channel.slug} drafts=${batch.drafts.length}`);
for (const d of batch.drafts) console.log(`- ${d.id}: ${d.title}`);
EOF
  exit 0
fi

if [[ -z "${REDIS_URL:-}" ]]; then
  echo "REDIS_URL is required to enqueue (or use --dry-run)" >&2
  exit 1
fi

export CONTENT_TENANT_SLUG="icso-splashitos"
node --input-type=module <<'EOF'
import { readFileSync } from 'node:fs';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';

const batch = JSON.parse(readFileSync(process.env.BATCH_PATH, 'utf8'));
const redisUrl = process.env.REDIS_URL;
const url = new URL(redisUrl);
const connection = {
  host: url.hostname,
  port: Number(url.port || 6379),
  password: url.password ? decodeURIComponent(url.password) : undefined,
  maxRetriesPerRequest: null,
};

const queue = new Queue('content-video', { connection });
const preset = batch.preset;
const now = new Date().toISOString();

for (const item of batch.drafts) {
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
    compliance_flags: ['not_peskids', 'icso_owned', 'human_upload_required'],
    state: 'approved',
    created_at: now,
    approved_at: now,
    approved_by: 'splashitos-batch-01',
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
      jobId: `splashitos:${item.id}`,
      removeOnComplete: 100,
      removeOnFail: 50,
    }
  );
  console.log(`enqueued ${item.id} job=${job.id}`);
}

await queue.close();
console.log('done');
EOF
