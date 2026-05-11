# Opsly Social Media Automation

## Overview

Automated system for generating and publishing **daily Reels** on Instagram, TikTok, and YouTube Shorts.
Content mixes:
- Clips/references from **famous streamers** (Ibai, Auronplay, Pokimane, etc.)
- **Opsly technical themes** (multi-tenant, DevOps, infrastructure, etc.)
- **Mixed language** (66% Spanish, 34% English)

## Automation Flow

```
GitHub Actions (Cron: 08:00 UTC)
    |
[1] Generate caption with Claude AI
    |
[2] Save draft to Supabase (social_posts)
    |
[3] Publish to Meta (Instagram) + TikTok + YouTube (09:00 UTC)
    |
[4] Record engagement metrics
    |
[5] Notify Slack
```

## Setup

### 1. Environment Variables

Add to `.env` or GitHub Secrets:

| Variable | Purpose | Provider |
|----------|---------|----------|
| `ANTHROPIC_API_KEY` | Caption generation | [console.anthropic.com](https://console.anthropic.com) |
| `SUPABASE_URL` | Database | [supabase.com/dashboard](https://supabase.com/dashboard) |
| `SUPABASE_KEY` | Database auth | Supabase Dashboard > Settings > API |
| `META_ACCESS_TOKEN` | Instagram Reels | [Meta App Center](https://developers.facebook.com/apps) |
| `TIKTOK_ACCESS_TOKEN` | TikTok | [TikTok Developer](https://developer.tiktok.com/) |
| `YOUTUBE_API_KEY` | YouTube Shorts | [Google Cloud Console](https://console.cloud.google.com) |
| `SLACK_WEBHOOK` | Notifications | [Slack App Config](https://api.slack.com/messaging/webhooks) |

### 2. Database Setup

Apply the migration (via Supabase CLI or standalone script):

```bash
# Option A: Supabase CLI (recommended)
npx supabase db push

# Option B: Direct psql
psql $SUPABASE_DATABASE_URL < scripts/supabase/init-social-tables.sql
```

### 3. Activate Workflow

The workflow runs daily at 08:00 UTC automatically. For manual testing:

```bash
gh workflow run daily-reel-generator.yml
```

Or run the generator script locally:

```bash
ANTHROPIC_API_KEY=sk-... SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=eyJ... \
  node scripts/social/generate-reel.mjs
```

## Prompt Templates

Three templates are selected randomly per run:

1. **streamer_reaction** -- Streamer reacts to an Opsly theme
2. **streamer_clip_mashup** -- Mashup of a streamer clip + technical visualization
3. **education_entertaining** -- Educational tutorial in Twitch style

## Tables

| Table | Purpose |
|-------|---------|
| `social_posts` | Generated posts with status tracking (draft/scheduled/published/failed) |
| `content_templates` | Reusable prompt templates |
| `featured_streamers` | Streamer catalog with clip URLs |

Migration: `supabase/migrations/0053_social_reels_automation.sql`

## Monitoring

```sql
-- Recent posts
SELECT id, title, caption, status, created_at
FROM social_posts
ORDER BY created_at DESC LIMIT 10;

-- Published engagement
SELECT id, caption, engagement_metrics
FROM social_posts
WHERE status = 'published';
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Meta API fails | Verify token at [developers.facebook.com](https://developers.facebook.com/) |
| TikTok rejects video | Must be 15-60s, MP4 format |
| YouTube doesn't publish | Channel needs 1000+ subscribers for API uploads |
| No caption generated | Check `ANTHROPIC_API_KEY` validity and quota |
