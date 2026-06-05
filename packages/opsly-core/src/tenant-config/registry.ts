import type { TenantConfig, TenantSlug } from '../types/index.js';

export interface TenantConfigRegistry {
  register(config: TenantConfig): void;
  get(slug: TenantSlug): TenantConfig | undefined;
  list(): readonly TenantConfig[];
}

export function createTenantRegistry(
  initial: readonly TenantConfig[] = [],
): TenantConfigRegistry {
  const bySlug = new Map<TenantSlug, TenantConfig>();

  for (const config of initial) {
    bySlug.set(config.slug, config);
  }

  return {
    register(config: TenantConfig): void {
      bySlug.set(config.slug, config);
    },
    get(slug: TenantSlug): TenantConfig | undefined {
      return bySlug.get(slug);
    },
    list(): readonly TenantConfig[] {
      return [...bySlug.values()];
    },
  };
}

export function assertTenantConfig(config: TenantConfig): void {
  for (const intent of config.allowedIntents) {
    if (!config.intents[intent]) {
      throw new Error(`Tenant ${config.slug}: missing intent definition for ${intent}`);
    }
  }
}
