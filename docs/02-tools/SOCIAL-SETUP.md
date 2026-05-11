# Social Media Automation - Setup Guide

## Quick Start

### 1. Install Dependencies

Dependencies are already in the monorepo. For standalone use in CI:

```bash
npm install @anthropic-ai/sdk @supabase/supabase-js
```

### 2. Create `.env.local`

```bash
cp .env.example .env.local
```

Fill in the 7 credentials (see `npm run social:secrets` for provider URLs):

- `ANTHROPIC_API_KEY` -- from console.anthropic.com
- `SUPABASE_URL` + `SUPABASE_KEY` -- from supabase.com/dashboard
- `META_ACCESS_TOKEN` -- from developers.facebook.com
- `TIKTOK_ACCESS_TOKEN` -- from developer.tiktok.com
- `YOUTUBE_API_KEY` -- from console.cloud.google.com
- `SLACK_WEBHOOK` -- from api.slack.com/messaging/webhooks

### 3. Initialize Supabase

```bash
# Option A: Supabase CLI migration
npx supabase db push

# Option B: SQL file directly
psql $SUPABASE_DATABASE_URL < scripts/supabase/init-social-tables.sql

# Option C: Seed data (after tables exist)
npm run social:seed
```

### 4. Validate Connections

```bash
npm run social:validate
```

### 5. Generate Test Reel

```bash
npm run social:generate -- --dry-run
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run social:generate` | Generate one reel (saves to Supabase) |
| `npm run social:generate -- --dry-run` | Generate caption without saving |
| `npm run social:generate -- --dry-run --streamer Ibai` | Specific streamer |
| `npm run social:publish` | Publish scheduled reels |
| `npm run social:publish -- --dry-run` | Preview what would be published |
| `npm run social:list` | List all reels |
| `npm run social:list -- --status draft` | Filter by status |
| `npm run social:test` | Run test suite |
| `npm run social:validate` | Validate API connections |
| `npm run social:seed` | Seed database with streamers + templates |
| `npm run social:secrets` | Show secrets checklist |

## GitHub Actions Setup

1. Go to: `Settings > Secrets and variables > Actions`
2. Add the same 7 secrets from `.env.local`
3. Enable and test:

```bash
gh workflow enable .github/workflows/daily-reel-generator.yml
gh workflow run daily-reel-generator.yml
gh run list --workflow=daily-reel-generator.yml
```

## Architecture

```
[08:00 UTC] GitHub Actions Cron
    |
generate-reel.mjs (Claude AI)
    |
Supabase (save as draft)
    |
[09:00 UTC] publish-scheduled.mjs
    |
Meta + TikTok + YouTube APIs
    |
Slack notification
```

See `docs/02-tools/SOCIAL-ARCHITECTURE.md` for the full architecture diagram.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `SUPABASE_KEY is undefined` | Create `.env.local` with valid Supabase credentials |
| Anthropic API error | Check `ANTHROPIC_API_KEY` validity; test with `--dry-run` first |
| Meta API 401 | Token expired; regenerate from Facebook App |
| Tests fail | Run `npm run social:test` with verbose output |
| Workflow doesn't trigger | Check cron is enabled: `gh workflow enable daily-reel-generator.yml` |
