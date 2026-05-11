# Social Media Automation — Architecture

## Stack

```
+-------------------------------------------------------------+
| GitHub Actions (Cron Job - 08:00 UTC daily)                 |
+-------------------------------------------------------------+
  |
  v
+-------------------------------------------------------------+
| generate-reel.mjs                                           |
|   - Claude AI (caption generation)                          |
|   - 3 prompt templates (randomized)                         |
|   - 6 streamers x 8 themes x 2 languages                   |
|   - Hashtag generation                                      |
+-------------------------------------------------------------+
  |
  v
+-------------------------------------------------------------+
| Supabase (PostgreSQL)                                       |
|   - social_posts (draft -> scheduled -> published)          |
|   - content_templates (reusable prompts)                    |
|   - featured_streamers (Ibai, Auronplay, etc.)              |
+-------------------------------------------------------------+
  |
  v
+-------------------------------------------------------------+
| publish-scheduled.mjs (09:00 UTC)                           |
|   - Meta Graph API (Instagram Reels)                        |
|   - TikTok Content Calendar API                             |
|   - YouTube Data API v3                                     |
+-------------------------------------------------------------+
  |
  v
+-------------------------------------------------------------+
| Slack Notification (status + link to run)                   |
+-------------------------------------------------------------+
```

## Data Flow

**Input:** Streamer + Opsly Theme (random)
**Processing:** Claude AI + Prompt Template (random)
**Output:** Caption + hashtags saved to `social_posts`, then published to 3 platforms

## CLI

```bash
npm run social:generate              # Generate (requires API keys)
npm run social:generate -- --dry-run # Generate without AI/Supabase
npm run social:publish               # Publish scheduled posts
npm run social:list                  # List posts from DB
npm run social:test                  # Run unit tests
npm run social:secrets               # Check which secrets are configured
```

## Tables (Migration 0053)

| Table | Purpose |
|-------|---------|
| `social_posts` | Generated content with lifecycle tracking |
| `content_templates` | Reusable prompt templates by category/language |
| `featured_streamers` | Streamer catalog with clip URLs |

## Security

- API keys stored in GitHub Actions Secrets (never in code)
- Supabase RLS can be applied if multi-user access is needed
- Platform tokens should be rotated per provider policy
- `.env.local` is gitignored; never commit real keys

## Files

| File | Role |
|------|------|
| `scripts/social/generate-reel.mjs` | Caption generator (Claude AI) |
| `scripts/social/publish-scheduled.mjs` | Multi-platform publisher |
| `scripts/social/commands.mjs` | CLI entrypoint |
| `scripts/social/__tests__/social-automation.test.mjs` | Unit tests |
| `scripts/setup/configure-secrets.mjs` | Secrets checklist helper |
| `scripts/supabase/init-social-tables.sql` | Standalone DB init |
| `scripts/supabase/seed-social-data.sql` | Seed streamers + templates |
| `supabase/migrations/0053_social_reels_automation.sql` | Canonical migration |
| `.github/workflows/daily-reel-generator.yml` | Daily cron + manual dispatch |
| `docs/02-tools/SOCIAL-AUTOMATION.md` | Setup and usage guide |
