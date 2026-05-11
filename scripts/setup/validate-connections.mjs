#!/usr/bin/env node
// scripts/setup/validate-connections.mjs
// Validates that all social media automation API connections are working.
// Reads from environment variables (set via .env.local, Doppler, or GitHub Secrets).

const CHECKS = [
  {
    name: 'Anthropic API',
    envVar: 'ANTHROPIC_API_KEY',
    test: async () => {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return { ok: false, reason: 'ANTHROPIC_API_KEY not set' };
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
      });
      return { ok: res.status === 200, reason: `HTTP ${res.status}` };
    },
  },
  {
    name: 'Supabase',
    envVar: 'SUPABASE_URL + SUPABASE_KEY',
    test: async () => {
      const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) return { ok: false, reason: 'SUPABASE_URL or SUPABASE_KEY not set' };
      const res = await fetch(`${url}/rest/v1/featured_streamers?select=count`, {
        headers: { Authorization: `Bearer ${key}`, apikey: key },
      });
      return { ok: res.status === 200, reason: `HTTP ${res.status}` };
    },
  },
  {
    name: 'Meta (Instagram)',
    envVar: 'META_ACCESS_TOKEN',
    test: async () => {
      const token = process.env.META_ACCESS_TOKEN;
      if (!token) return { ok: false, reason: 'META_ACCESS_TOKEN not set' };
      const res = await fetch(
        `https://graph.instagram.com/v18.0/me?fields=id&access_token=${token}`,
      );
      return { ok: res.status === 200, reason: `HTTP ${res.status}` };
    },
  },
  {
    name: 'TikTok',
    envVar: 'TIKTOK_ACCESS_TOKEN',
    test: async () => {
      const token = process.env.TIKTOK_ACCESS_TOKEN;
      if (!token) return { ok: false, reason: 'TIKTOK_ACCESS_TOKEN not set' };
      return { ok: true, reason: 'token present (no free validation endpoint)' };
    },
  },
  {
    name: 'YouTube',
    envVar: 'YOUTUBE_API_KEY',
    test: async () => {
      const key = process.env.YOUTUBE_API_KEY;
      if (!key) return { ok: false, reason: 'YOUTUBE_API_KEY not set' };
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=id&chart=mostPopular&maxResults=1&key=${key}`,
      );
      return { ok: res.status === 200, reason: `HTTP ${res.status}` };
    },
  },
  {
    name: 'Slack Webhook',
    envVar: 'SLACK_WEBHOOK',
    test: async () => {
      const url = process.env.SLACK_WEBHOOK;
      if (!url) return { ok: false, reason: 'SLACK_WEBHOOK not set' };
      return { ok: url.startsWith('https://hooks.slack.com/'), reason: 'URL format check' };
    },
  },
];

async function main() {
  console.log('Validating social media API connections...\n');

  let passed = 0;
  for (const check of CHECKS) {
    try {
      const result = await check.test();
      const icon = result.ok ? '[OK]' : '[  ]';
      console.log(`  ${icon} ${check.name} — ${result.reason}`);
      if (result.ok) passed++;
    } catch (err) {
      console.log(`  [  ] ${check.name} — ${err.message}`);
    }
  }

  console.log(`\nResult: ${passed}/${CHECKS.length} connections OK`);

  if (passed < CHECKS.length) {
    console.log('\nMissing credentials? Run: npm run social:secrets');
  }

  process.exit(passed === CHECKS.length ? 0 : 1);
}

main();
