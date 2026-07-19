/**
 * Global application constants
 */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const;

// Constants exported from apps/api/lib/constants.ts for broader use
export const DOCKER_PS_LIST_MAX = 500;

export const DEMO_SYSTEM_METRICS_MOCK = {
  CPU_PERCENT: 27.3,
  RAM_USED_GB: 6.8,
  RAM_TOTAL_GB: 16,
  DISK_USED_GB: 48,
  DISK_TOTAL_GB: 120,
  UPTIME_SECONDS: 259_200,
  CONTAINERS_WHEN_DOCKER_UNKNOWN: 12,
} as const;

export const WEBHOOK_CRYPTO = {
  SECRET_RANDOM_BYTES: 32,
} as const;

export const DEFENSE_API = {
  AUDITS_LIST_MAX: 100,
  MIN_PATH_ID_LEN: 10,
} as const;

export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
} as const;
