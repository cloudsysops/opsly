/**
 * Periodic Shield MVP: triggers API cron that runs secret scan + score recompute for active tenants.
 * Requires CRON_SECRET + reachable API (OPSLY_API_INTERNAL_URL or OPSLY_API_URL).
 */
const SHIELD_SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000;

function resolveApiBase(): string {
  return (
    process.env.OPSLY_API_INTERNAL_URL?.trim() ||
    process.env.OPSLY_API_URL?.trim() ||
    'http://app:3000'
  );
}

async function triggerShieldCron(): Promise<{ ok: boolean; status: number; body: string }> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.warn('[shield-scan] CRON_SECRET not set; skipping');
    return { ok: false, status: 0, body: 'no CRON_SECRET' };
  }
  const base = resolveApiBase();
  const url = `${base.replace(/\/$/, '')}/api/cron/shield-secret-scan`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(120_000),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text.slice(0, 500) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[shield-scan] request failed', msg);
    return { ok: false, status: 0, body: msg };
  }
}

export interface ShieldScanWorkerHandle {
  stop(): Promise<void>;
}

export function startShieldScanWorker(): ShieldScanWorkerHandle {
  async function tick(): Promise<void> {
    const r = await triggerShieldCron();
    if (r.ok) {
      console.log('[shield-scan] cron ok', r.status, r.body);
    } else {
      console.warn('[shield-scan] cron not ok', r.status, r.body);
    }
  }

  void tick().catch((err) => {
    console.error('[shield-scan] initial tick', err);
  });

  const timer = setInterval(() => {
    void tick().catch((err) => {
      console.error('[shield-scan] tick', err);
    });
  }, SHIELD_SCAN_INTERVAL_MS);

  return {
    async stop(): Promise<void> {
      clearInterval(timer);
    },
  };
}
