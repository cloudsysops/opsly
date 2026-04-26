import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Espejo de `apps/api/lib/tenant-context.ts` para el plano worker (orquestador).
 * Mantiene el mismo contrato ALS para alinear DAL/repositorios futuros con la API.
 */
export type TenantContext = {
  readonly tenantId: string;
  readonly tenantSlug: string;
};

const tenantStorage = new AsyncLocalStorage<TenantContext>();

export class TenantContextMissingError extends Error {
  constructor(
    message = 'TENANT_CONTEXT_MISSING: ningún tenant activo (use runWithTenantContext).'
  ) {
    super(message);
    this.name = 'TenantContextMissingError';
  }
}

export function runWithTenantContext<T>(
  context: TenantContext,
  fn: () => T | Promise<T>
): T | Promise<T> {
  return tenantStorage.run(context, fn);
}

export function getTenantContext(): TenantContext {
  const store = tenantStorage.getStore();
  if (!store) {
    throw new TenantContextMissingError();
  }
  return store;
}

export function tryGetTenantContext(): TenantContext | null {
  return tenantStorage.getStore() ?? null;
}
