import { createClient } from 'redis';
import { notifyDiscord } from './NotifyWorker.js';
import { logWorkerWarn, logWorkerError } from '../observability/worker-log.js';
import { orchestratorQueue } from '../queue.js';

const HEALTH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const MAX_CONSECUTIVE_FAILURES = 3;
const FAILURE_TTL_SECONDS = 3600; // 1h — limpia contadores obsoletos
const FAILURE_KEY = (slug: string, svc: string) => `health:failures:${slug}:${svc}`;
const RESTART_LOCK_KEY = (slug: string) => `health:restart-lock:${slug}`;
const RESTART_LOCK_TTL = 10 * 60; // 10 min — evita reinicios repetidos
const PLATFORM_EDGE_LOCK = 'health:restart-lock:platform:edge';

interface TenantRow {
  slug: string;
}

async function fetchActiveSlugs(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return [];
  }

  try {
    const res = await fetch(
      `${url}/rest/v1/tenants?select=slug&status=eq.active&deleted_at=is.null`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Accept-Profile': 'platform',
        },
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as TenantRow[];
    return data.map((t) => t.slug);
  } catch {
    return [];
  }
}

async function pingUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10_000),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

function buildServiceUrls(slug: string): Record<string, string> {
  const domain = process.env.PLATFORM_DOMAIN ?? '';
  const urls: Record<string, string> = {
    n8n: `https://n8n-${slug}.${domain}`,
    uptime: `https://uptime-${slug}.${domain}`,
  };
  // Peskids public origin (CF 521 class) — not only n8n/uptime
  if (slug === 'peskids') {
    urls.app = process.env.PESKIDS_PUBLIC_HEALTH_URL ?? 'https://www.peskids.com/api/health';
  }
  return urls;
}

async function enqueueEdgeRecover(reason: string): Promise<boolean> {
  try {
    await orchestratorQueue.add('self-heal', {
      tenant_slug: 'peskids',
      service: 'edge',
      action: 'edge-recover',
      reason,
    });
    return true;
  } catch {
    return false;
  }
}

async function checkPlatformEdge(redis: ReturnType<typeof createClient>): Promise<void> {
  const domain = process.env.PLATFORM_DOMAIN ?? 'op-sly.com';
  const url = `https://api.${domain}/api/health`;
  const ok = await pingUrl(url);
  const fKey = FAILURE_KEY('platform', 'api');
  if (ok) {
    await resetFailures(redis, fKey);
    return;
  }
  const failures = await incrementFailures(redis, fKey);
  logWorkerWarn('health', 'Platform API failure', { failures, url });
  if (failures < MAX_CONSECUTIVE_FAILURES) return;

  const already = await redis.get(PLATFORM_EDGE_LOCK);
  if (already) return;
  await redis.set(PLATFORM_EDGE_LOCK, '1', { EX: RESTART_LOCK_TTL });
  await notifyDiscord(
    '⚠️ Platform API unreachable — edge-recover',
    `API falló ${failures} veces.\nURL: ${url}\nEncolando self-heal edge-recover…`,
    'warning'
  );
  const queued = await enqueueEdgeRecover(`health_worker_api_${failures}`);
  if (queued) {
    await resetFailures(redis, fKey);
  }
}

async function getFailureCount(
  redis: ReturnType<typeof createClient>,
  key: string
): Promise<number> {
  const val = await redis.get(key);
  return val ? parseInt(val, 10) : 0;
}

async function incrementFailures(
  redis: ReturnType<typeof createClient>,
  key: string
): Promise<number> {
  const count = await redis.incr(key);
  await redis.expire(key, FAILURE_TTL_SECONDS);
  return count;
}

async function resetFailures(redis: ReturnType<typeof createClient>, key: string): Promise<void> {
  await redis.del(key);
}

async function tryDockerRestart(slug: string): Promise<boolean> {
  const { execa } = await import('execa');
  try {
    await execa('docker', ['compose', `--project-name=tenant_${slug}`, 'restart']);
    return true;
  } catch {
    return false;
  }
}

async function openGitHubIssue(slug: string, details: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN?.trim() || process.env.GITHUB_TOKEN_N8N?.trim() || '';
  const repo = process.env.OPSLY_GITHUB_REPO ?? 'cloudsysops/opsly';
  if (!token) {
    return;
  }

  await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({
      title: `🔴 [Auto] Tenant ${slug} unreachable after restart`,
      body: [
        `## Tenant health failure — auto escalation`,
        ``,
        `- **Slug:** \`${slug}\``,
        `- **When:** ${new Date().toISOString()}`,
        ``,
        `### Details`,
        `\`\`\``,
        details,
        `\`\`\``,
        ``,
        `_Opened automatically by HealthWorker. Assign to on-call engineer._`,
      ].join('\n'),
      labels: ['bug', 'automated', 'tenant-health'],
    }),
  }).catch(() => {
    // no bloquea el flujo
  });
}

async function checkTenant(redis: ReturnType<typeof createClient>, slug: string): Promise<void> {
  const urls = buildServiceUrls(slug);

  for (const [svc, url] of Object.entries(urls)) {
    const healthy = await pingUrl(url);
    const fKey = FAILURE_KEY(slug, svc);

    if (healthy) {
      await resetFailures(redis, fKey);
      continue;
    }

    const failures = await incrementFailures(redis, fKey);
    logWorkerWarn('health', 'Service failure', { slug, svc, failures, url });

    if (failures >= MAX_CONSECUTIVE_FAILURES) {
      // 1ª alerta: intento de restart
      const lockKey = RESTART_LOCK_KEY(`${slug}:${svc}`);
      const alreadyRestarted = await redis.get(lockKey);

      if (!alreadyRestarted) {
        await redis.set(lockKey, '1', { EX: RESTART_LOCK_TTL });
        await notifyDiscord(
          `⚠️ Tenant unreachable — attempting restart`,
          `**${slug}** / \`${svc}\` falló ${failures} veces consecutivas.\nURL: ${url}\nIntentando \`docker compose restart\`…`,
          'warning'
        );

        // Peskids app / edge: prefer edge-watchdog via SelfHeal (handles Traefik 521)
        if (slug === 'peskids' || svc === 'app') {
          const queued = await enqueueEdgeRecover(`health_worker_${slug}_${svc}_${failures}`);
          if (queued) {
            await notifyDiscord(
              `🔄 Edge-recover queued for ${slug}`,
              `\`${svc}\` → self-heal edge-recover. Monitorizando…`,
              'info'
            );
            await resetFailures(redis, fKey);
            continue;
          }
        }

        const restarted = await tryDockerRestart(slug);
        if (restarted) {
          await notifyDiscord(
            `🔄 Restart triggered for ${slug}`,
            `\`${svc}\` reiniciado. Monitorizando…`,
            'info'
          );
          await resetFailures(redis, fKey);
        } else {
          // Compose restart failed → try edge-watchdog once, then escalate
          const queued = await enqueueEdgeRecover(`health_worker_fallback_${slug}_${svc}`);
          if (queued) {
            await notifyDiscord(
              `🔄 Fallback edge-recover for ${slug}`,
              `compose restart falló; encolado edge-recover`,
              'warning'
            );
            await resetFailures(redis, fKey);
            continue;
          }
          const details = `slug=${slug}, svc=${svc}, url=${url}, failures=${failures}`;
          await notifyDiscord(
            `🔴 Restart FAILED — escalating ${slug}`,
            `No se pudo reiniciar \`${svc}\`.\n${details}\nCreando issue en GitHub…`,
            'error'
          );
          await openGitHubIssue(slug, details);
        }
      } else {
        // Ya se intentó restart y sigue fallando
        const details = `slug=${slug}, svc=${svc}, url=${url}, failures=${failures} (post-restart)`;
        await notifyDiscord(`🔴 ${slug}/${svc} still down after restart`, details, 'error');
      }
    }
  }
}

export interface HealthWorkerHandle {
  stop(): Promise<void>;
}

export function startHealthWorker(connection: {
  host: string;
  port: number;
  password?: string;
}): HealthWorkerHandle {
  const redis = createClient({
    socket: { host: connection.host, port: connection.port },
    password: connection.password,
  });

  redis.on('error', (err) => {
    logWorkerError('health', 'Redis error', {
      message: err instanceof Error ? err.message : String(err),
    });
  });

  const connectPromise = redis.connect().catch((err) => {
    logWorkerError('health', 'Redis connect failed', {
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  });

  async function tick(): Promise<void> {
    const slugs = await fetchActiveSlugs();
    await Promise.allSettled([
      checkPlatformEdge(redis),
      ...slugs.map((slug) => checkTenant(redis, slug)),
    ]);
  }

  // Primera ejecución inmediata
  void tick().catch((err) => {
    logWorkerError('health', 'Initial tick error', {
      message: err instanceof Error ? err.message : String(err),
    });
  });

  const timer = setInterval(() => {
    void tick().catch((err) => {
      logWorkerError('health', 'Tick error', {
        message: err instanceof Error ? err.message : String(err),
      });
    });
  }, HEALTH_INTERVAL_MS);

  return {
    async stop(): Promise<void> {
      clearInterval(timer);
      await connectPromise;
      if (redis.isOpen) {
        await redis.disconnect();
      }
    },
  };
}
