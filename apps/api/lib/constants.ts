/**
 * Constantes compartidas de la API Opsly (sin secretos).
 *
 * - HTTP_STATUS: códigos HTTP más usados en respuestas y comprobaciones.
 * - TENANT_STATUS: estados del ciclo de vida de un tenant en la plataforma.
 * - BILLING_PLANS: planes lógicos para límites; alinear nombres con Stripe/producto cuando apliquen.
 * - RETRY_CONFIG: valores orientativos para colas BullMQ (attempts + backoff).
 * - CACHE_TTL: TTL en segundos para caché Redis (operaciones > ~100 ms).
 */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const TENANT_STATUS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  PENDING: "pending",
  CANCELLED: "cancelled",
} as const;

export type TenantStatus = (typeof TENANT_STATUS)[keyof typeof TENANT_STATUS];

/** Planes de facturación (nombres canónicos en código). Mapear a `config/opsly.config.json` / Stripe según producto. */
export const BILLING_PLANS = {
  STARTER: "starter",
  PRO: "pro",
  ENTERPRISE: "enterprise",
} as const;

export type BillingPlanId = (typeof BILLING_PLANS)[keyof typeof BILLING_PLANS];

/** Límites por plan (ajustar según contrato comercial). */
export const BILLING_PLAN_LIMITS: Record<
  BillingPlanId,
  { maxTenants: number; maxWorkflows: number }
> = {
  [BILLING_PLANS.STARTER]: { maxTenants: 3, maxWorkflows: 10 },
  [BILLING_PLANS.PRO]: { maxTenants: 15, maxWorkflows: 50 },
  [BILLING_PLANS.ENTERPRISE]: { maxTenants: 100, maxWorkflows: 500 },
};

/** Reintentos recomendados para jobs BullMQ (backoff en ms). */
export const RETRY_CONFIG = {
  DEFAULT_ATTEMPTS: 5,
  BACKOFF_INITIAL_MS: 1_000,
  BACKOFF_MAX_MS: 60_000,
} as const;

/** TTL de caché en segundos (Redis). */
export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
} as const;

/** Polling de health en orquestación (onboarding / resume). */
export const ORCHESTRATION_HEALTH = {
  MAX_ATTEMPTS: 12,
  FETCH_TIMEOUT_MS: 4_000,
  POLL_INTERVAL_MS: 5_000,
} as const;

/** Paginación API listados. */
export const LIST_TENANTS = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

/** Generación compose (bytes criptográficos). */
export const COMPOSE_CRYPTO = {
  N8N_PASSWORD_RANDOM_BYTES: 24,
  N8N_ENCRYPTION_KEY_RANDOM_BYTES: 32,
} as const;

/** JSON legible en emails. */
export const JSON_PRETTY_PRINT_INDENT = 2;

/** Pasos del pipeline de onboarding (para rollback y progreso). */
export const ONBOARDING_PIPELINE = {
  INITIAL: 3,
  AFTER_PORTS: 4,
  AFTER_COMPOSE_WRITTEN: 5,
  AFTER_COMPOSE_STARTED: 6,
  AFTER_HEALTH: 7,
  AFTER_ACTIVE_DB: 8,
  AFTER_EMAIL: 9,
  AFTER_NOTIFY: 10,
} as const;

/** Umbrales de rollback (comparar con lastCompletedStep). */
export const ONBOARDING_ROLLBACK = {
  DELETE_TENANT_MIN_STEP: 2,
  RELEASE_PORTS_MIN_STEP: 4,
  STOP_COMPOSE_MIN_STEP: 6,
  MARK_FAILED_MIN_STEP: 8,
} as const;
