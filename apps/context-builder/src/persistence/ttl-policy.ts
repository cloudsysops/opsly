/**
 * TTL Policy — calcula el tiempo de expiración de una sesión de agente según el plan del tenant.
 *
 * | Plan       | TTL   |
 * |------------|-------|
 * | startup    | 24 h  |
 * | business   | 7 d   |
 * | enterprise | 30 d  |
 */

export type TenantPlan = "startup" | "business" | "enterprise";

const TTL_MS: Record<TenantPlan, number> = {
  startup:    24 * 60 * 60 * 1_000,        // 24 h
  business:   7 * 24 * 60 * 60 * 1_000,    // 7 d
  enterprise: 30 * 24 * 60 * 60 * 1_000,   // 30 d
};

/** Retorna la fecha de expiración para el plan dado. */
export function getSessionExpiry(plan: TenantPlan): Date {
  return new Date(Date.now() + TTL_MS[plan]);
}

/** Retorna los milisegundos de TTL para el plan dado. */
export function getSessionTtlMs(plan: TenantPlan): number {
  return TTL_MS[plan];
}

/** Determina si un `expires_at` (Date o ISO string) ya pasó. */
export function isExpired(expiresAt: Date | string): boolean {
  const ts = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  return ts < Date.now();
}
