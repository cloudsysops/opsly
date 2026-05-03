/** Prefix for `X-Opsly-Signature` when using explicit scheme (n8n-friendly). */
export const LS_WEBHOOK_SHA256_PREFIX = 'sha256=' as const;

export const LS_WEBHOOK_SHA256_PREFIX_LEN = LS_WEBHOOK_SHA256_PREFIX.length;

/** Max length for optional `event` string in webhook payloads. */
export const LS_WEBHOOK_EVENT_MAX_LEN = 120;
