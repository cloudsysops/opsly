import { AsyncLocalStorage } from 'node:async_hooks';
import { createClient } from '@supabase/supabase-js';
import type { OrchestratorJob } from '../types.js';
import type { TenantPlan } from '../decision-engine.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

/**
 * Contexto de tenant para AsyncLocalStorage (ALS) — usado por Hermes y otros.
 */
export interface TenantContext {
  tenantId: string; // UUID from platform.tenants.id
  tenantSlug: string; // slug from platform.tenants.slug
}

/** ALS para tenant context (per-request isolation). */
const tenantALS = new AsyncLocalStorage<TenantContext>();

/**
 * Get current tenant context from ALS.
 * Throws if no context available.
 */
export function getTenantContext(): TenantContext {
  const ctx = tenantALS.getStore();
  if (!ctx) {
    throw new Error(
      '[tenant-context] No tenant context in AsyncLocalStorage. Did you forget to wrap with withTenantContext()?'
    );
  }
  return ctx;
}

/**
 * Run a function with tenant context in ALS.
 */
export async function withTenantContext<T>(
  context: TenantContext,
  fn: () => Promise<T>
): Promise<T> {
  return tenantALS.run(context, fn);
}

/**
 * Fetch tenant plan from Supabase.
 * Returns 'free' if tenant not found (graceful degradation).
 */
export async function getTenantPlan(tenantSlug: string): Promise<TenantPlan> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('plan')
      .eq('slug', tenantSlug)
      .single();

    if (error || !data) {
      console.warn(`[tenant-context] Could not fetch plan for ${tenantSlug}:`, error?.message);
      return 'free';
    }

    return (data.plan as TenantPlan) || 'free';
  } catch (err) {
    console.error(`[tenant-context] Error fetching tenant plan:`, err);
    return 'free';
  }
}

/**
 * Check if tenant is active (not suspended or deleted).
 */
export async function isTenantActive(tenantSlug: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('status')
      .eq('slug', tenantSlug)
      .single();

    if (error || !data) {
      return false;
    }

    return data.status === 'active';
  } catch {
    return false;
  }
}

/**
 * Get normalized tenant_slug from job (default to "opsly" for internal/backward-compatible jobs).
 * Returns the tenant_slug with sensible default for unspecified jobs.
 */
export function getJobTenantSlug(job: OrchestratorJob): string {
  return job.tenant_slug || 'opsly';
}

/**
 * Validate that a job has required tenant context.
 * Throws if tenant_slug is invalid format (but allows missing for backward compat, defaulting to "opsly").
 */
export function validateJobTenantContext(job: OrchestratorJob): void {
  const slug = getJobTenantSlug(job);

  if (!slug || slug.trim() === '') {
    throw new Error(
      `[tenant-context] Job ${job.type} missing required tenant_slug. All jobs must be tenant-scoped.`
    );
  }

  if (typeof slug !== 'string' || slug.length > 255) {
    throw new Error(
      `[tenant-context] Invalid tenant_slug format: "${slug}". Must be non-empty string ≤255 chars.`
    );
  }
}

/**
 * Check if a job should be rejected or delayed due to tenant policy.
 * Returns true if job should proceed, false if should be delayed/rejected.
 */
export async function checkTenantJobPolicy(job: OrchestratorJob): Promise<boolean> {
  // Validate context first
  try {
    validateJobTenantContext(job);
  } catch (err) {
    console.error(`[tenant-context] Validation failed:`, err);
    return false;
  }

  // Get normalized tenant slug
  const tenantSlug = getJobTenantSlug(job);

  // Check if tenant is active
  const active = await isTenantActive(tenantSlug);
  if (!active) {
    console.warn(`[tenant-context] Tenant ${tenantSlug} is not active`);
    return false;
  }

  return true;
}
