#!/usr/bin/env node
// scripts/social/commands.mjs
// CLI for Opsly social media automation.
// Usage: node scripts/social/commands.mjs <command> [options]

import { generateDailyReel } from './generate-reel.mjs';
import { publishScheduledReels, listPosts } from './publish-scheduled.mjs';

const HELP = `
opsly-social CLI

Commands:
  generate   Generate a daily Reel caption
  publish    Publish scheduled Reels to platforms
  list       List posts from Supabase

Options (generate):
  --dry-run             Skip AI call and Supabase insert
  --streamer <name>     Use a specific streamer (e.g. "Ibai")
  --theme <theme>       Use a specific theme (e.g. "multi-tenant")
  --language <lang>     Force language: es or en

Options (publish):
  --dry-run             Log what would be published without calling APIs

Options (list):
  --status <status>     Filter by status: draft, scheduled, published, failed

Examples:
  node scripts/social/commands.mjs generate --dry-run
  node scripts/social/commands.mjs generate --streamer Ibai --language es
  node scripts/social/commands.mjs publish --dry-run
  node scripts/social/commands.mjs list --status draft
`;

function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      opts.dryRun = true;
    } else if (args[i] === '--streamer' && args[i + 1]) {
      opts.streamer = args[++i];
    } else if (args[i] === '--theme' && args[i + 1]) {
      opts.theme = args[++i];
    } else if (args[i] === '--language' && args[i + 1]) {
      opts.language = args[++i];
    } else if (args[i] === '--status' && args[i + 1]) {
      opts.status = args[++i];
    }
  }
  return opts;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const opts = parseArgs(rest);

  switch (command) {
    case 'generate': {
      const reel = await generateDailyReel(opts);
      console.log('\nResult:', JSON.stringify(reel, null, 2));
      break;
    }
    case 'publish': {
      const results = await publishScheduledReels(opts);
      console.log('\nResults:', JSON.stringify(results, null, 2));
      break;
    }
    case 'list': {
      const posts = await listPosts(opts);
      if (posts.length === 0) {
        console.log('No posts found.');
      } else {
        for (const p of posts) {
          console.log(`[${p.status}] ${p.id} — ${p.title || p.caption?.slice(0, 60)}`);
        }
      }
      break;
    }
    default:
      console.log(HELP);
      break;
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
