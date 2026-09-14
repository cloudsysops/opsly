import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { acquireClaim, releaseClaim, getClaimStatus } from '../lib/machine-claim.mjs';

// Minimal fake Redis: only what machine-claim.mjs actually calls (eval, get, pttl).
// Real enough to exercise the compare-and-set / compare-and-delete Lua logic without
// needing a live Redis instance in CI.
function fakeRedis() {
  const store = new Map(); // key -> { value, expiresAt }

  function readLive(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }
    return entry;
  }

  return {
    store,
    async get(key) {
      const entry = readLive(key);
      return entry ? entry.value : null;
    },
    async pttl(key) {
      const entry = readLive(key);
      if (!entry) return -2;
      if (entry.expiresAt === null) return -1;
      return entry.expiresAt - Date.now();
    },
    // Only supports the two exact scripts machine-claim.mjs sends.
    async eval(script, _numkeys, key, arg1, arg2) {
      const current = readLive(key)?.value ?? null;
      if (script.includes("redis.call('SET'")) {
        // acquire/renew script
        const holder = arg1;
        const ttlMs = Number(arg2);
        if (current === null || current === holder) {
          store.set(key, { value: holder, expiresAt: Date.now() + ttlMs });
          return 1;
        }
        return 0;
      }
      // release script
      const holder = arg1;
      if (current === holder) {
        store.delete(key);
        return 1;
      }
      return 0;
    },
  };
}

describe('machine-claim: acquireClaim', () => {
  it('acquires a free lock', async () => {
    const redis = fakeRedis();
    const result = await acquireClaim(redis, { machine: 'pc-gamer', holder: 'alice', ttlMs: 60_000 });
    assert.equal(result.acquired, true);
    assert.equal(result.holder, 'alice');
  });

  it('refuses a lock held by someone else and reports who holds it', async () => {
    const redis = fakeRedis();
    await acquireClaim(redis, { machine: 'pc-gamer', holder: 'alice', ttlMs: 60_000 });

    const result = await acquireClaim(redis, { machine: 'pc-gamer', holder: 'bob', ttlMs: 60_000 });
    assert.equal(result.acquired, false);
    assert.equal(result.holder, 'alice');
    assert.ok(result.ttlMs > 0);
  });

  it('is idempotent for the same holder and renews the TTL', async () => {
    const redis = fakeRedis();
    await acquireClaim(redis, { machine: 'pc-gamer', holder: 'alice', ttlMs: 1_000 });

    const renewed = await acquireClaim(redis, { machine: 'pc-gamer', holder: 'alice', ttlMs: 60_000 });
    assert.equal(renewed.acquired, true);

    const status = await getClaimStatus(redis, { machine: 'pc-gamer' });
    assert.ok(status.ttlMs > 1_000, 'renew should extend the TTL past the original short one');
  });

  it('lets a new holder acquire once the previous claim has expired', async () => {
    const redis = fakeRedis();
    await acquireClaim(redis, { machine: 'pc-gamer', holder: 'alice', ttlMs: 1 });

    await new Promise((r) => setTimeout(r, 15));

    const result = await acquireClaim(redis, { machine: 'pc-gamer', holder: 'bob', ttlMs: 60_000 });
    assert.equal(result.acquired, true);
    assert.equal(result.holder, 'bob');
  });

  it('scopes locks per machine independently', async () => {
    const redis = fakeRedis();
    await acquireClaim(redis, { machine: 'pc-gamer', holder: 'alice', ttlMs: 60_000 });

    const other = await acquireClaim(redis, { machine: 'mac2011', holder: 'bob', ttlMs: 60_000 });
    assert.equal(other.acquired, true, 'a lock on a different machine must not be blocked');
  });
});

describe('machine-claim: releaseClaim', () => {
  it('releases a lock you hold', async () => {
    const redis = fakeRedis();
    await acquireClaim(redis, { machine: 'pc-gamer', holder: 'alice', ttlMs: 60_000 });

    const result = await releaseClaim(redis, { machine: 'pc-gamer', holder: 'alice' });
    assert.equal(result.released, true);

    const status = await getClaimStatus(redis, { machine: 'pc-gamer' });
    assert.equal(status.held, false);
  });

  it('refuses to release a lock held by someone else', async () => {
    const redis = fakeRedis();
    await acquireClaim(redis, { machine: 'pc-gamer', holder: 'alice', ttlMs: 60_000 });

    const result = await releaseClaim(redis, { machine: 'pc-gamer', holder: 'bob' });
    assert.equal(result.released, false);

    const status = await getClaimStatus(redis, { machine: 'pc-gamer' });
    assert.equal(status.held, true);
    assert.equal(status.holder, 'alice');
  });

  it('is a no-op releasing a lock that is not held', async () => {
    const redis = fakeRedis();
    const result = await releaseClaim(redis, { machine: 'pc-gamer', holder: 'alice' });
    assert.equal(result.released, false);
  });
});

describe('machine-claim: getClaimStatus', () => {
  it('reports not held for a fresh machine', async () => {
    const redis = fakeRedis();
    const status = await getClaimStatus(redis, { machine: 'pc-gamer' });
    assert.deepEqual(status, { held: false, holder: null, ttlMs: null });
  });
});


describe('pc-gamer reconnect machine-claim contract', () => {
  it('fails closed, renews the lease, and has no unsafe skip switch', () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'scripts/ops/pc-gamer-reconnect.sh'),
      'utf8'
    );
    assert.match(source, /start_machine_claim_heartbeat/);
    assert.match(source, /machine-claim\.mjs" acquire/);
    assert.match(source, /trap 'release_machine_claim; exit 130' INT TERM/);
    assert.doesNotMatch(source, /MACHINE_CLAIM_SKIP/);
  });
});
