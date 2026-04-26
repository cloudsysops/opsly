import type { SupabaseClient } from '@supabase/supabase-js';

/** Schema `platform` en runtime; el cliente genérico del monorepo no lo declara. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- boundary intencional para PostgREST multi-schema.
export function platformSchema(client: SupabaseClient): any {
  return (client as unknown as { schema: (s: string) => unknown }).schema('platform');
}

/** RPC en schema `public` expuesto por PostgREST. */
export async function supabaseRpc<T>(
  client: SupabaseClient,
  fn: string,
  params: Record<string, unknown>
): Promise<{ data: T | null; error: { message: string } | null }> {
  const res = await (
    client as unknown as {
      rpc: (
        f: string,
        p: Record<string, unknown>
      ) => Promise<{ data: T | null; error: { message: string } | null }>;
    }
  ).rpc(fn, params);
  return { data: res.data ?? null, error: res.error ?? null };
}
