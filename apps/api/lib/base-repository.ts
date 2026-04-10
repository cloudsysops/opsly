import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";
import { getTenantContext } from "./tenant-context";

const PLATFORM_SCHEMA = "platform" as const;

/** Tablas PostgREST bajo `platform.*` definidas en `Database`. */
export type PlatformTableName = keyof Database["platform"]["Tables"];

export type TenantColumn = "tenant_id" | "tenant_slug";

export type BaseRepositoryOptions = {
  /** Columna usada para aislar filas (default `tenant_id`). */
  tenantColumn?: TenantColumn;
};

function tenantValue(
  column: TenantColumn,
  tenantId: string,
  tenantSlug: string,
): string {
  return column === "tenant_id" ? tenantId : tenantSlug;
}

function assertNoTenantOverride(
  data: Record<string, unknown>,
  column: TenantColumn,
  expected: string,
): void {
  if (
    column in data &&
    data[column] !== undefined &&
    data[column] !== expected
  ) {
    throw new Error(
      `TENANT_MISMATCH: ${column} en datos no coincide con el contexto de tenant`,
    );
  }
}

/**
 * Capa base tenant-aware sobre Supabase: inyecta filtro por tenant en lecturas
 * y valida/inyecta en escrituras. Requiere `runWithTenantContext` / `setTenantContext`.
 */
export class BaseRepository {
  constructor(protected readonly client: SupabaseClient<Database>) {}

  /* Los encadenamientos PostgREST de `.schema("platform")` se infieren; tipos explícitos
   * chocan con genéricos profundos de `@supabase/postgrest-js`. */
  /* eslint-disable @typescript-eslint/explicit-function-return-type */

  /**
   * SELECT con `.eq` automático por tenant.
   */
  select(
    table: PlatformTableName,
    columns: string,
    options?: BaseRepositoryOptions,
  ) {
    const { tenantId, tenantSlug } = getTenantContext();
    const col = options?.tenantColumn ?? "tenant_id";
    const value = tenantValue(col, tenantId, tenantSlug);
    return this.client
      .schema(PLATFORM_SCHEMA)
      .from(table)
      .select(columns)
      .eq(col, value);
  }

  /**
   * INSERT con `tenant_id` o `tenant_slug` inyectado y sin permitir suplantación.
   */
  insert(
    table: PlatformTableName,
    data: Record<string, unknown>,
    options?: BaseRepositoryOptions,
  ) {
    const { tenantId, tenantSlug } = getTenantContext();
    const col = options?.tenantColumn ?? "tenant_id";
    assertNoTenantOverride(data, col, tenantValue(col, tenantId, tenantSlug));
    const payload = {
      ...data,
      [col]: tenantValue(col, tenantId, tenantSlug),
    };
    return this.client.schema(PLATFORM_SCHEMA).from(table).insert(payload);
  }

  /**
   * UPDATE con `.eq` por tenant obligatorio.
   */
  update(
    table: PlatformTableName,
    data: Record<string, unknown>,
    options?: BaseRepositoryOptions,
  ) {
    const { tenantId, tenantSlug } = getTenantContext();
    const col = options?.tenantColumn ?? "tenant_id";
    assertNoTenantOverride(data, col, tenantValue(col, tenantId, tenantSlug));
    const payload = { ...data };
    if (col in payload) {
      delete payload[col];
    }
    return this.client
      .schema(PLATFORM_SCHEMA)
      .from(table)
      .update(payload)
      .eq(col, tenantValue(col, tenantId, tenantSlug));
  }

  /**
   * DELETE con `.eq` por tenant obligatorio.
   */
  delete(table: PlatformTableName, options?: BaseRepositoryOptions) {
    const { tenantId, tenantSlug } = getTenantContext();
    const col = options?.tenantColumn ?? "tenant_id";
    return this.client
      .schema(PLATFORM_SCHEMA)
      .from(table)
      .delete()
      .eq(col, tenantValue(col, tenantId, tenantSlug));
  }

  /* eslint-enable @typescript-eslint/explicit-function-return-type */
}
