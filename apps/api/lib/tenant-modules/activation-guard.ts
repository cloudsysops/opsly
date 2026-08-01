import type { PersistedTenantModuleStatus } from '../services/tenant-modules.service';

/**
 * Extra slack added on top of the bootstrap timeout window before an
 * in-progress row is considered abandoned (process died mid-run).
 */
export const STALE_BUFFER_MINUTES = 5;

/**
 * How long a `queued` / `provisioning` row stays authoritative. Mirrors the
 * bootstrap timeout used by `runModuleProvisioning`
 * (`estimated_setup_minutes * 2`) plus a buffer for the smoke script and DB
 * round-trips.
 */
export function activationStaleAfterMs(estimatedSetupMinutes: number): number {
  return (estimatedSetupMinutes * 2 + STALE_BUFFER_MINUTES) * 60_000;
}

export type ActivationRow = {
  status: PersistedTenantModuleStatus;
  updated_at: string | null;
};

export type ActivationPrecondition =
  | { allowed: true }
  | { allowed: false; reason: 'already_active' | 'in_progress'; message: string };

/**
 * Idempotency guard for POST .../activate.
 *
 * - no row / `failed` / `disabled` → activate.
 * - `active` / `active_needs_manual_steps` → reject (defensive; the UI does not
 *   offer the button for these).
 * - `queued` / `provisioning` → reject while still inside the expected run
 *   window, allow once it is stale (recovery path when the API process died
 *   mid-run and left the row pinned to `provisioning` forever).
 */
export function evaluateActivationPrecondition(
  row: ActivationRow | null,
  estimatedSetupMinutes: number,
  now: number = Date.now()
): ActivationPrecondition {
  if (!row) {
    return { allowed: true };
  }

  if (row.status === 'active' || row.status === 'active_needs_manual_steps') {
    return {
      allowed: false,
      reason: 'already_active',
      message: 'Module is already active',
    };
  }

  if (row.status === 'queued' || row.status === 'provisioning') {
    const updatedAt = row.updated_at ? Date.parse(row.updated_at) : Number.NaN;
    // Unknown/unparsable timestamp: treat as stale so the row can never get
    // permanently stuck with no recovery path.
    if (Number.isNaN(updatedAt)) {
      return { allowed: true };
    }
    const isStale = now - updatedAt > activationStaleAfterMs(estimatedSetupMinutes);
    if (isStale) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'in_progress',
      message: 'Activation already in progress for this module',
    };
  }

  // failed / disabled
  return { allowed: true };
}
