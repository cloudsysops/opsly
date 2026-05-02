import { AsyncLocalStorage } from 'node:async_hooks';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  return supabaseInstance;
}

/**
 * Contexto de tenant para LLM Gateway — per-request isolation con AsyncLocalStorage.
 * Permite que cada request sea consciente de su tenant para cache, cost tracking, etc.
 */
export interface TenantContext {
  tenantSlug: string; // slug from platform.tenants.slug
  tenantId?: string; // UUID from platform.tenants.id (opcional)
  plan?: 'startup' | 'business' | 'enterprise';
}

/** ALS para tenant context (per-request isolation). */
const tenantALS = new AsyncLocalStorage<TenantContext>();

/**
 * Get current tenant context from ALS.
 * Returns null if no context available (graceful degradation).
 */
export function getTenantContext(): TenantContext | null {
  return tenantALS.getStore() ?? null;
}

/**
 * Get current tenant context, throw if not available.
 * Use when tenant is required for operation.
 */
export function getTenantContextOrThrow(): TenantContext {
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
 * Extract and validate tenant slug from header.
 * Returns null if header missing or invalid.
 */
export function extractTenantFromHeader(headerValue: string | undefined): string | null {
  if (!headerValue || typeof headerValue !== 'string') {
    return null;
  }
  const trimmed = headerValue.trim();
  if (trimmed.length === 0 || trimmed.length > 255) {
    return null;
  }
  // Validate format: lowercase alphanumeric + hyphen, no leading/trailing hyphen
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(trimmed) && trimmed.length > 1) {
    if (!/^[a-z0-9]$/.test(trimmed)) {
      return null;
    }
  }
  return trimmed;
}

/**
 * Validate tenant is active and get full context from Supabase.
 * Returns full context if valid, null if not found or inactive.
 */
export async function validateAndGetTenant(tenantSlug: string): Promise<TenantContext | null> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('[tenant-context] Supabase client not initialized');
      return null;
    }

    const { data, error } = await supabase
      .from('tenants')
      .select('id,slug,plan,status')
      .eq('slug', tenantSlug)
      .single();

    if (error || !data) {
      console.warn(`[tenant-context] Tenant not found: ${tenantSlug}`, error?.message);
      return null;
    }

    if (data.status !== 'active') {
      console.warn(`[tenant-context] Tenant not active: ${tenantSlug} (status: ${data.status})`);
      return null;
    }

    return {
      tenantSlug: data.slug,
      tenantId: data.id,
      plan: data.plan as 'startup' | 'business' | 'enterprise' | undefined,
    };
  } catch (err) {
    console.error(`[tenant-context] Error validating tenant ${tenantSlug}:`, err);
    return null;
  }
}

/**
 * Middleware para Express/Node HTTP — extrae y valida tenant header.
 * Establece tenant context en ALS si válido.
 * Retorna false si header falta o es inválido (caller debe responder 401).
 */
export async function extractTenantContextFromRequest(
  headerValue: string | undefined
): Promise<TenantContext | null> {
  const tenantSlug = extractTenantFromHeader(headerValue);
  if (!tenantSlug) {
    return null;
  }

  // Validar contra Supabase
  const context = await validateAndGetTenant(tenantSlug);
  return context;
}

/**
 * Check if a tenant is active (not suspended or deleted).
 */
export async function isTenantActive(tenantSlug: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return false;
    }

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
 * Get tenant plan from Supabase.
 * Returns 'startup' if tenant not found (graceful degradation).
 */
export async function getTenantPlan(
  tenantSlug: string
): Promise<'startup' | 'business' | 'enterprise'> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return 'startup';
    }

    const { data, error } = await supabase
      .from('tenants')
      .select('plan')
      .eq('slug', tenantSlug)
      .single();

    if (error || !data) {
      console.warn(`[tenant-context] Could not fetch plan for ${tenantSlug}:`, error?.message);
      return 'startup';
    }

    return (data.plan as 'startup' | 'business' | 'enterprise') || 'startup';
  } catch (err) {
    console.error(`[tenant-context] Error fetching tenant plan:`, err);
    return 'startup';
  }
}

/**
 * Get current tenant slug from context, with fallback.
 * Returns 'opsly' if no context (internal/backward-compatible default).
 */
export function getCurrentTenantSlug(): string {
  const ctx = getTenantContext();
  return ctx?.tenantSlug || 'opsly';
}
