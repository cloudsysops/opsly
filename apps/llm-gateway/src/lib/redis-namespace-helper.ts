import type { RedisClientType } from 'redis';

/**
 * Helper para construir claves Redis con namespace per-tenant.
 * Patrón: tenant:{slug}:{service}:{key}
 */
export function buildTenantKey(tenantSlug: string, service: string, key: string): string {
  return `tenant:${tenantSlug}:${service}:${key}`;
}

/**
 * Simple wrapper para Redis operations con namespace automático.
 */
export class NamespacedRedis {
  constructor(
    private redis: RedisClientType,
    private tenantSlug: string,
    private service: string
  ) {}

  async get(key: string): Promise<string | null> {
    const fullKey = buildTenantKey(this.tenantSlug, this.service, key);
    return this.redis.get(fullKey);
  }

  async set(key: string, value: string): Promise<void> {
    const fullKey = buildTenantKey(this.tenantSlug, this.service, key);
    await this.redis.set(fullKey, value);
  }

  async setEx(key: string, ttlSeconds: number, value: string): Promise<void> {
    const fullKey = buildTenantKey(this.tenantSlug, this.service, key);
    await this.redis.setEx(fullKey, ttlSeconds, value);
  }

  async keys(pattern: string): Promise<string[]> {
    const fullPattern = buildTenantKey(this.tenantSlug, this.service, pattern);
    const allKeys = await this.redis.keys(fullPattern);
    // Retornar solo la parte relativa (sin el namespace completo)
    const prefix = buildTenantKey(this.tenantSlug, this.service, '');
    return allKeys.map((k) => k.slice(prefix.length));
  }
}
