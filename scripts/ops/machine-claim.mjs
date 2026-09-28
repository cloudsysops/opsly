#!/usr/bin/env node
// CLI for the machine-claim advisory lock (see scripts/ops/lib/machine-claim.mjs for why).
//
// Usage:
//   ./scripts/ops/machine-claim.mjs acquire --machine pc-gamer --holder "$(whoami)@$(hostname)" [--ttl 600]
//   ./scripts/ops/machine-claim.mjs release --machine pc-gamer --holder "$(whoami)@$(hostname)"
//   ./scripts/ops/machine-claim.mjs status  --machine pc-gamer
//
// Exit codes: 0 = success (acquired / released / status printed), 1 = held by someone
// else (acquire) or not held by you (release), 2 = usage/connection error.
//
// REDIS_URL must be set to the Tailscale-reachable form (see infra/pc-gamer.env.example:
// redis://default:PASSWORD@100.120.151.91:6379/0), NOT the internal docker-network
// hostname (redis://...@redis:6379) that's only resolvable from inside the VPS compose
// network — that hostname will not resolve from a Mac or pc-gamer.

import IORedis from 'ioredis';
import { acquireClaim, releaseClaim, getClaimStatus } from './lib/machine-claim.mjs';

function parseArgs(argv) {
  const [action, ...rest] = argv;
  const opts = { ttl: 600 };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--machine') opts.machine = rest[++i];
    else if (arg === '--holder') opts.holder = rest[++i];
    else if (arg === '--ttl') opts.ttl = Number(rest[++i]);
  }
  return { action, opts };
}

function usageAndExit() {
  console.error('usage: machine-claim.mjs <acquire|release|status> --machine <name> [--holder <id>] [--ttl <seconds>]');
  process.exit(2);
}

const { action, opts } = parseArgs(process.argv.slice(2));
if (!['acquire', 'release', 'status'].includes(action) || !opts.machine) usageAndExit();
if ((action === 'acquire' || action === 'release') && !opts.holder) usageAndExit();

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error('REDIS_URL is required');
  process.exit(2);
}

const redis = new IORedis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 4000 });
redis.on('error', () => {}); // surfaced via the try/catch below instead of ioredis's own noisy unhandled-error log

try {
  if (action === 'acquire') {
    const result = await acquireClaim(redis, { machine: opts.machine, holder: opts.holder, ttlMs: opts.ttl * 1000 });
    console.log(JSON.stringify(result));
    process.exit(result.acquired ? 0 : 1);
  } else if (action === 'release') {
    const result = await releaseClaim(redis, { machine: opts.machine, holder: opts.holder });
    console.log(JSON.stringify(result));
    process.exit(result.released ? 0 : 1);
  } else {
    const result = await getClaimStatus(redis, { machine: opts.machine });
    console.log(JSON.stringify(result));
    process.exit(0);
  }
} catch (err) {
  const message = String(err?.message || err);
  if (message.includes('ENOTFOUND redis') || message.includes('max retries per request limit')) {
    console.error(
      `${message}\nHint: REDIS_URL looks like the internal docker-network form (host "redis"), which only resolves inside the VPS compose network. From a Mac or pc-gamer, use the Tailscale-reachable form instead — see infra/pc-gamer.env.example (redis://default:PASSWORD@100.120.151.91:6379/0).`
    );
  } else {
    console.error(message);
  }
  process.exit(2);
} finally {
  await redis.quit().catch(() => {});
}
