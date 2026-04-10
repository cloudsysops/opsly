import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Contexto de tenant obligatorio para el DAL tenant-aware.
 * `tenant_id` (UUID) y `tenant_slug` cubren tablas que usan una u otra columna en `platform.*`.
 */
export type TenantContext = {
  readonly tenantId: string;
  readonly tenantSlug: string;
};

const tenantStorage = new AsyncLocalStorage<TenantContext>();

export class TenantContextMissingError extends Error {
  constructor(message = "TENANT_CONTEXT_MISSING: ninguna petición activa estableció el tenant (use runWithTenantContext).") {
    super(message);
    this.name = "TenantContextMissingError";
  }
}

/**
 * Ejecuta `fn` dentro de AsyncLocalStorage con el tenant fijado.
 * Único punto de entrada válido: ALS no permite "set" suelto sin `run`.
 */
export function runWithTenantContext<T>(
  context: TenantContext,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return tenantStorage.run(context, fn);
}

/**
 * Variante con argumentos sueltos (mismo efecto que `runWithTenantContext`).
 * No confundir con un setter global: debe envolver todo el trabajo async de la request.
 */
export function setTenantContext<T>(
  tenantId: string,
  tenantSlug: string,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return runWithTenantContext({ tenantId, tenantSlug }, fn);
}

/**
 * Obtiene el tenant actual. Lanza si no hay contexto (evita queries sin filtro).
 */
export function getTenantContext(): TenantContext {
  const store = tenantStorage.getStore();
  if (!store) {
    throw new TenantContextMissingError();
  }
  return store;
}

/**
 * Devuelve el contexto o `null` (solo para comprobaciones; el DAL debe usar `getTenantContext`).
 */
export function tryGetTenantContext(): TenantContext | null {
  return tenantStorage.getStore() ?? null;
}
