/**
 * Slug de tenant para jobs/intents del control plane sin contexto de tenant (Hive, arranque, fallbacks).
 * Alineado con HERMES / NotebookLM; no hardcodear en cada callsite.
 */
export function getInternalPlatformTenantSlug(): string {
  return (
    process.env.HERMES_FALLBACK_TENANT_SLUG?.trim() ||
    process.env.NOTEBOOKLM_DEFAULT_TENANT_SLUG?.trim() ||
    'platform'
  );
}
