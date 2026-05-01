import { createClient, type RedisClientType } from 'redis';
import { notifyDiscord } from './discord-notify.js';

const HEALTH_INTERVAL_MS = 30_000;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const RETRY_DOWN_INTERVAL_MS = 60_000;
const HEALTH_TTL_SECONDS = 300;

export interface ProviderHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  latency_ms: number;
  last_check: string;
  consecutive_failures: number;
}

type HealthCheckFn = () => Promise<number>;

const BASE_HEALTH_CHECKS: Record<string, HealthCheckFn> = {
  anthropic: async () => {
    const start = Date.now();
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`);
    return Date.now() - start;
  },

  llama_local: async () => {
    const start = Date.now();
    const url = (process.env.OLLAMA_URL ?? 'http://localhost:11434').replace(/\/$/, '');
    const res = await fetch(`${url}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    return Date.now() - start;
  },

  openrouter: async () => {
    const start = Date.now();
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ''}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`);
    return Date.now() - start;
  },

  openai: async () => {
    const start = Date.now();
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
    return Date.now() - start;
  },
};

const DEEPSEEK_HEALTH_CHECK: Record<
  'deepseek',
  HealthCheckFn
> = {
  deepseek: async () => {
    const start = Date.now();
    const base = (process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1').replace(/\/$/, '');
    const res = await fetch(`${base}/models`, {
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY ?? ''}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`);
    return Date.now() - start;
  },
};

const HEALTH_CHECKS: Record<string, HealthCheckFn> = {
  ...BASE_HEALTH_CHECKS,
  ...(process.env.DEEPSEEK_API_KEY?.trim() ? DEEPSEEK_HEALTH_CHECK : {}),
};

export class HealthDaemon {
  private redis: RedisClientType;
  private intervals: NodeJS.Timeout[] = [];
  private connected = false;

  constructor() {
    this.redis = createClient({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
    });
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected) return;
    await this.redis.connect();
    this.connected = true;
  }

  async start(): Promise<void> {
    await this.ensureConnected();
    console.log('[health-daemon] Iniciado — chequeando providers cada 30s');
    await this.checkAll();
    const interval = setInterval(() => {
      void this.checkAll();
    }, HEALTH_INTERVAL_MS);
    this.intervals.push(interval);
  }

  async stop(): Promise<void> {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    if (this.connected) {
      await this.redis.disconnect();
      this.connected = false;
    }
  }

  async checkAll(): Promise<void> {
    await Promise.allSettled(
      Object.entries(HEALTH_CHECKS).map(([name, check]) => this.checkProvider(name, check))
    );
  }

  private async checkProvider(name: string, check: HealthCheckFn): Promise<void> {
    let prevStatus = 'unknown';
    try {
      await this.ensureConnected();
      prevStatus = await this.getStatus(name);
    } catch {
      prevStatus = 'unknown';
    }

    if (prevStatus === 'down') {
      const full = await this.getFullHealth(name).catch(() => null);
      if (full?.last_check) {
        const last = Date.parse(full.last_check);
        if (Number.isFinite(last) && Date.now() - last < RETRY_DOWN_INTERVAL_MS) {
          return;
        }
      }
    }

    try {
      const latency = await check();
      const status: ProviderHealth['status'] = latency > 3000 ? 'degraded' : 'up';

      await this.setHealth(name, {
        name,
        status,
        latency_ms: latency,
        last_check: new Date().toISOString(),
        consecutive_failures: 0,
      });

      if (prevStatus === 'down') {
        void Promise.resolve(
          notifyDiscord(`✅ Provider recuperado: ${name}`, `Latencia: ${latency}ms`, 'success')
        ).catch(() => {});
      }
    } catch (err) {
      try {
        await this.ensureConnected();
      } catch {
        return;
      }
      const prev = await this.getFullHealth(name).catch(() => null);
      const failures = (prev?.consecutive_failures ?? 0) + 1;
      const status: ProviderHealth['status'] =
        failures >= CIRCUIT_BREAKER_THRESHOLD ? 'down' : 'degraded';

      await this.setHealth(name, {
        name,
        status,
        latency_ms: -1,
        last_check: new Date().toISOString(),
        consecutive_failures: failures,
      });

      if (status === 'down' && prevStatus !== 'down') {
        const msg = err instanceof Error ? err.message : String(err);
        void Promise.resolve(
          notifyDiscord(
            `🔴 Provider caído: ${name}`,
            `Fallos consecutivos: ${failures}\nError: ${msg}`,
            'error'
          )
        ).catch(() => {});
      }
    }
  }

  async isAvailable(healthKey: string): Promise<boolean> {
    try {
      await this.ensureConnected();
      const status = await this.getStatus(healthKey);
      return status === 'up' || status === 'degraded' || status === 'unknown';
    } catch (e) {
      console.warn('[health-daemon] Redis no disponible — asumiendo providers disponibles:', e);
      return true;
    }
  }

  async getStatus(name: string): Promise<string> {
    await this.ensureConnected();
    return (await this.redis.get(`provider:${name}:status`)) ?? 'unknown';
  }

  async getFullHealth(name: string): Promise<ProviderHealth | null> {
    await this.ensureConnected();
    const data = await this.redis.get(`provider:${name}:health`);
    return data ? (JSON.parse(data) as ProviderHealth) : null;
  }

  async getAllHealth(): Promise<ProviderHealth[]> {
    const names = Object.keys(HEALTH_CHECKS);
    const out: ProviderHealth[] = [];
    for (const n of names) {
      const h = await this.getFullHealth(n);
      if (h) out.push(h);
    }
    return out;
  }

  private async setHealth(name: string, health: ProviderHealth): Promise<void> {
    await this.ensureConnected();
    const json = JSON.stringify(health);
    await this.redis.setEx(`provider:${name}:health`, HEALTH_TTL_SECONDS, json);
    await this.redis.setEx(`provider:${name}:status`, HEALTH_TTL_SECONDS, health.status);
    await this.redis.setEx(
      `provider:${name}:latency`,
      HEALTH_TTL_SECONDS,
      String(health.latency_ms)
    );
    await this.redis.setEx(`provider:${name}:last_check`, HEALTH_TTL_SECONDS, health.last_check);
    await this.redis.setEx(
      `provider:${name}:consecutive_failures`,
      HEALTH_TTL_SECONDS,
      String(health.consecutive_failures)
    );
  }
}

export const healthDaemon = new HealthDaemon();
