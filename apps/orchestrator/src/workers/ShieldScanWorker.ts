/**
 * Periodic Shield MVP: triggers API cron that runs secret scan + score recompute for active tenants.
 * Requires CRON_SECRET + reachable API (OPSLY_API_INTERNAL_URL or OPSLY_API_URL).
 */
import { logWorkerInfo, logWorkerWarn, logWorkerError } from '../observability/worker-log.js';

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
    logWorkerWarn('shield-scan', 'CRON_SECRET not set; skipping');
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
    logWorkerError('shield-scan', 'Request failed', { message: msg });
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
      logWorkerInfo('shield-scan', 'Cron ok', { status: r.status, body: r.body });
    } else {
      logWorkerWarn('shield-scan', 'Cron not ok', { status: r.status, body: r.body });
    }
  }

  void tick().catch((err) => {
    logWorkerError('shield-scan', 'Initial tick error', {
      message: err instanceof Error ? err.message : String(err),
    });
  });

  const timer = setInterval(() => {
    void tick().catch((err) => {
      logWorkerError('shield-scan', 'Tick error', {
        message: err instanceof Error ? err.message : String(err),
      });
    });
  }, SHIELD_SCAN_INTERVAL_MS);

  return {
    async stop(): Promise<void> {
      clearInterval(timer);
    },
  };
}
