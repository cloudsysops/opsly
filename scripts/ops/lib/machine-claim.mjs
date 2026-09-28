// Advisory mutual-exclusion lock for raw (non-orchestrator-dispatched) access to a
// shared physical machine — e.g. an operator or agent SSH-ing into pc-gamer to run
// `wsl --shutdown` / `docker compose up`.
//
// This exists because DispatchClaimLease (apps/orchestrator/src/http/routes/local.ts)
// already prevents two orchestrator-dispatched AgentTasks from racing each other, but
// it only guards work that goes through /api/local/prompt-submit. Any session with SSH
// access can still bypass the queue entirely and touch the machine directly — which is
// exactly how two concurrent Claude Code sessions thrashed pc-gamer's docker-compose
// stack on 2026-09-13/14 (repeated container recreation, Ollama never staying healthy
// long enough to be reachable). Same class of problem as DISPATCH_SCOPE_ALREADY_OWNED,
// one layer lower: physical-machine access instead of task dispatch.
//
// Same Redis instance the orchestrator already uses (REDIS_URL) — no new infra.

const KEY_PREFIX = 'opsly:machine-claim:';

function claimKey(machine) {
  return `${KEY_PREFIX}${machine}`;
}

/**
 * Try to acquire the claim. Idempotent for the same holder (re-acquiring extends the TTL).
 * @returns {Promise<{acquired: boolean, holder: string|null, ttlMs: number|null}>}
 */
export async function acquireClaim(redis, { machine, holder, ttlMs }) {
  if (!machine) throw new Error('machine is required');
  if (!holder) throw new Error('holder is required');
  if (!ttlMs || ttlMs <= 0) throw new Error('ttlMs must be a positive number');

  const key = claimKey(machine);

  // Atomic: only set if same holder (renew) or nobody holds it (fresh acquire).
  // Lua so the read-then-write is a single Redis operation — no TOCTOU race between
  // two callers acquiring at the same instant.
  const script = `
    local current = redis.call('GET', KEYS[1])
    if current == false or current == ARGV[1] then
      redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])
      return 1
    end
    return 0
  `;
  const ok = await redis.eval(script, 1, key, holder, String(ttlMs));

  if (ok === 1) {
    return { acquired: true, holder, ttlMs };
  }

  const current = await redis.get(key);
  const remaining = await redis.pttl(key);
  return { acquired: false, holder: current, ttlMs: remaining > 0 ? remaining : null };
}

/**
 * Release the claim, but only if the caller is still the current holder — never
 * release a lock you don't own (e.g. after your own TTL already expired and someone
 * else acquired it).
 * @returns {Promise<{released: boolean}>}
 */
export async function releaseClaim(redis, { machine, holder }) {
  if (!machine) throw new Error('machine is required');
  if (!holder) throw new Error('holder is required');

  const key = claimKey(machine);
  const script = `
    if redis.call('GET', KEYS[1]) == ARGV[1] then
      return redis.call('DEL', KEYS[1])
    end
    return 0
  `;
  const deleted = await redis.eval(script, 1, key, holder);
  return { released: deleted === 1 };
}

/**
 * @returns {Promise<{held: boolean, holder: string|null, ttlMs: number|null}>}
 */
export async function getClaimStatus(redis, { machine }) {
  if (!machine) throw new Error('machine is required');

  const key = claimKey(machine);
  const holder = await redis.get(key);
  if (!holder) return { held: false, holder: null, ttlMs: null };

  const ttlMs = await redis.pttl(key);
  return { held: true, holder, ttlMs: ttlMs > 0 ? ttlMs : null };
}
