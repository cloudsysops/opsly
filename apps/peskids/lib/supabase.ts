/**
 * CANONICAL service-role Supabase client for Peskids.
 *
 * There are exactly three client flavours in this app and each has one home:
 *
 *   browser-safe (anon key, RLS applies)   -> lib/supabase-browser.ts
 *   server, acting as the signed-in user   -> lib/supabase-server.ts (SSR cookies)
 *   server, service role (bypasses RLS)    -> this file
 *
 * Nothing else may call `createClient` from `@supabase/supabase-js` directly —
 * `lib/__tests__/db-client-boundaries.test.ts` enforces that statically.
 *
 * The service-role key must never reach a browser bundle, so every construction
 * goes through `assertServerRuntime()` first. That is a real runtime tripwire,
 * not documentation: if a `'use client'` module ever imports this file the
 * component throws immediately instead of shipping the key.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';
import { checkEnvironmentBoundary } from './runtime/environment';

/**
 * Throws if a service-role client is being constructed anywhere a browser can
 * observe it. Exported so other server-only modules can reuse the same guard.
 */
export function assertServerRuntime(context = 'supabaseServer'): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      `${context}: the Supabase service-role client is server-only and must never be ` +
        `constructed in the browser.`
    );
  }
}

let boundaryChecked = false;

/**
 * The service-role client bypasses RLS entirely, so the environment boundary is
 * checked before the first one is handed out. This is the backstop for the
 * startup check in instrumentation.ts (which does not run in every worker, e.g.
 * a standalone script importing a service).
 */
function assertBoundaryOnce(): void {
  if (boundaryChecked) return;
  const result = checkEnvironmentBoundary();
  if (!result.ok) {
    const blocking = result.violations.filter(
      (violation) =>
        violation.code === 'production_db_outside_production' ||
        violation.code === 'production_not_using_production_db' ||
        violation.code === 'browser_selectable_environment'
    );
    if (blocking.length > 0) {
      throw new Error(
        `Refusing to open a service-role connection: environment boundary violated ` +
          `(${blocking.map((violation) => violation.code).join(', ')})`
      );
    }
  }
  boundaryChecked = true;
}

/** Test-only: clears the memoised boundary result. */
export function resetSupabaseBoundaryCacheForTests(): void {
  boundaryChecked = false;
}

function createServerClient(token?: string) {
  assertServerRuntime();
  assertBoundaryOnce();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase server env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Doppler prd)'
    );
  }

  const globalHeaders: Record<string, string> = {};
  if (token) {
    globalHeaders.authorization = `Bearer ${token}`;
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: Object.keys(globalHeaders).length > 0 ? { headers: globalHeaders } : undefined,
  });
}

export const supabaseServer = (token?: string) => {
  return createServerClient(token);
};

/** Alias for webhook routes (same service-role client). */
export const getServiceClient = supabaseServer;

/**
 * Service-role client for Supabase Auth admin operations (generateLink, etc.).
 * Same credentials as `supabaseServer()`, but named so the audit trail shows
 * which call sites hold admin-auth power rather than plain table access.
 */
export function supabaseAuthAdmin() {
  return createServerClient();
}

/**
 * Same canonical service-role client, but with the generated `Database` generic
 * dropped so schemas that are not in `lib/types.ts` (notably `platform`) can be
 * addressed. Still routes through `createServerClient`, so the server-only and
 * environment-boundary guards apply.
 */
export function supabaseServerUntypedSchema(): SupabaseClient {
  return createServerClient() as unknown as SupabaseClient;
}

export type RecentMessageWithMode = Pick<
  Database['public']['Tables']['messages']['Row'],
  | 'id'
  | 'source'
  | 'sender_name'
  | 'sender_contact'
  | 'message_text'
  | 'created_at'
  | 'direction'
  | 'status'
> & {
  conversation_mode: 'admissions' | 'support';
};

function detectConversationMode(senderContact: string): 'admissions' | 'support' {
  return senderContact.includes('web:support:') ? 'support' : 'admissions';
}

export async function getRecentMessages(tenantId: string, limit: number = 10) {
  const client = supabaseServer();
  const { data, error } = await client
    .from('messages')
    .select('id, source, sender_name, sender_contact, message_text, created_at, direction, status, external_id')
    .eq('tenant_id', tenantId)
    .or('direction.eq.inbound,direction.is.null')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent messages:', error);
    return [];
  }

  return (data || []).map((message) => ({
    ...message,
    conversation_mode: detectConversationMode(message.sender_contact),
  })) as RecentMessageWithMode[];
}

export type WacrmMessageForInbox = Pick<
  Database['public']['Tables']['messages']['Row'],
  'sender_contact' | 'message_text' | 'created_at' | 'status' | 'direction' | 'external_id'
>;

/**
 * Both directions, no tenant-wide cap on recency — the per-lead wacrm inbox
 * badge (deriveWacrmLeadInboxSnapshot) needs a contact's full inbound +
 * outbound history to tell "no conversation" apart from "pending"/"responded".
 * getRecentMessages() is inbound-only and capped at 10 tenant-wide, so it
 * can't answer that per lead. Mirrors the wacrmMessages query in
 * daily-digest.service.ts.
 */
export async function getWacrmMessages(
  tenantId: string,
  limit: number = 200
): Promise<WacrmMessageForInbox[]> {
  const client = supabaseServer();
  const { data, error } = await client
    .from('messages')
    .select('sender_contact, message_text, created_at, status, direction, external_id')
    .eq('tenant_id', tenantId)
    .like('external_id', 'wacrm:%')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching wacrm messages:', error);
    return [];
  }

  return data ?? [];
}
