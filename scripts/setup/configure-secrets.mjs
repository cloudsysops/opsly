#!/usr/bin/env node
// scripts/setup/configure-secrets.mjs
// Prints the GitHub Secrets that must be configured for the social automation workflow.
// Does NOT create secrets programmatically — the user sets them via the GitHub UI.

const SECRETS = [
  {
    name: 'ANTHROPIC_API_KEY',
    purpose: 'Claude AI caption generation',
    url: 'https://console.anthropic.com/account/keys',
  },
  {
    name: 'SUPABASE_URL',
    purpose: 'Database (social_posts table)',
    url: 'https://supabase.com/dashboard → Settings → API → URL',
  },
  {
    name: 'SUPABASE_KEY',
    purpose: 'Database auth (anon or service role key)',
    url: 'https://supabase.com/dashboard → Settings → API',
  },
  {
    name: 'META_ACCESS_TOKEN',
    purpose: 'Instagram Reels publishing',
    url: 'https://developers.facebook.com/apps → Token Generator',
  },
  {
    name: 'TIKTOK_ACCESS_TOKEN',
    purpose: 'TikTok video publishing',
    url: 'https://developer.tiktok.com → Authentication',
  },
  {
    name: 'YOUTUBE_API_KEY',
    purpose: 'YouTube Shorts publishing',
    url: 'https://console.cloud.google.com → APIs & Services → Credentials',
  },
  {
    name: 'SLACK_WEBHOOK',
    purpose: 'Slack notifications after publish',
    url: 'https://api.slack.com/messaging/webhooks',
  },
];

console.log('GITHUB SECRETS SETUP — Social Media Automation\n');
console.log('Go to: Settings > Secrets and variables > Actions\n');
console.log('Configure these secrets:\n');

for (const s of SECRETS) {
  const envVal = process.env[s.name];
  const status = envVal ? 'SET' : 'MISSING';
  console.log(`  ${status === 'SET' ? '[OK]' : '[  ]'} ${s.name}`);
  console.log(`       ${s.purpose}`);
  console.log(`       ${s.url}\n`);
}

const missing = SECRETS.filter((s) => !process.env[s.name]);
if (missing.length > 0) {
  console.log(`\n${missing.length} secret(s) not found in current environment.`);
  console.log('Set them in GitHub Actions Secrets before running the workflow.');
} else {
  console.log('\nAll secrets are available in the current environment.');
}
