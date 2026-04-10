import type { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository } from "../base-repository";
import { BILLING_METER_UNIT_COST_USD } from "../billing-meter-pricing";
import { getServiceClient } from "../supabase";
import type { Database, Json } from "../supabase/types";

type UsageRow = {
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  cache_hit: boolean;
};

export type UsageMonthSummary = {
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  requests: number;
  cache_hits: number;
};

export type UsageMeterEventType = "ai_tokens" | "cpu_time";

/**
 * Registro de consumo para `platform.usage_events` (DAL inyecta `tenant_slug`).
 * `unit_cost` efectivo = `cost_usd / quantity` (derivado de constantes o de `unitCostUsd`).
 */
export type RecordUsageEventParams = {
  eventType: UsageMeterEventType;
  /** Tokens totales (ai) o segundos (cpu), según `eventType`. */
  quantity: number;
  metadata?: Json;
  /**
   * Coste por unidad en USD (token o segundo). Si se omite, usa constantes de
   * `BILLING_METER_UNIT_COST_USD`.
   */
  unitCostUsd?: number;
  /** Solo `ai_tokens`: desglose; si faltan, se usa `quantity` en input. */
  tokensInput?: number;
  tokensOutput?: number;
  /** Etiqueta del modelo o recurso (p. ej. `gpt-4o`, `worker`). */
  model?: string;
};

function defaultModelLabel(eventType: UsageMeterEventType): string {
  return eventType === "cpu_time" ? "meter:cpu_time" : "meter:ai_tokens";
}

function sessionIdFromMetadata(metadata: Json | undefined): string | null {
  if (
    metadata === null ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return null;
  }
  const sid = (metadata as Record<string, unknown>).session_id;
  return typeof sid === "string" && sid.length > 0 ? sid : null;
}

/**
 * Ejemplo de repositorio tenant-aware: el negocio no pasa `tenant_slug` manualmente;
 * el filtro lo aplica `BaseRepository` usando `AsyncLocalStorage`.
 */
export class UsageRepository extends BaseRepository {
  constructor(client: SupabaseClient<Database> = getServiceClient()) {
    super(client);
  }

  /**
   * Inserta una fila de consumo en `platform.usage_events` con aislamiento por tenant.
   */
  async recordEvent(params: RecordUsageEventParams): Promise<void> {
    const baseUnit =
      params.eventType === "ai_tokens"
        ? BILLING_METER_UNIT_COST_USD.AI_TOKEN
        : BILLING_METER_UNIT_COST_USD.CPU_SECOND;
    const unitCostUsd = params.unitCostUsd ?? baseUnit;
    const costUsd = params.quantity * unitCostUsd;

    let tokensInput = 0;
    let tokensOutput = 0;
    if (params.eventType === "ai_tokens") {
      if (
        params.tokensInput !== undefined ||
        params.tokensOutput !== undefined
      ) {
        tokensInput = params.tokensInput ?? 0;
        tokensOutput = params.tokensOutput ?? 0;
      } else {
        tokensInput = Math.max(0, Math.floor(params.quantity));
        tokensOutput = 0;
      }
    }

    const model = params.model ?? defaultModelLabel(params.eventType);

    const { error } = await this.insert(
      "usage_events",
      {
        model,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        cost_usd: costUsd,
        cache_hit: false,
        session_id: sessionIdFromMetadata(params.metadata),
      },
      { tenantColumn: "tenant_slug" },
    );

    if (error) {
      throw new Error(`usage_events insert: ${error.message}`);
    }
  }

  /**
   * Agregado del mes calendario actual para `platform.usage_events` (columna `tenant_slug`).
   */
  async getUsageCurrentMonth(): Promise<UsageMonthSummary> {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data, error } = await this.select(
      "usage_events",
      "tokens_input,tokens_output,cost_usd,cache_hit",
      { tenantColumn: "tenant_slug" },
    ).gte("created_at", from);

    if (error) {
      throw new Error(`usage_events select: ${error.message}`);
    }

    const rows = (data ?? []) as unknown as UsageRow[];

    return {
      tokens_input: rows.reduce((sum, row) => sum + row.tokens_input, 0),
      tokens_output: rows.reduce((sum, row) => sum + row.tokens_output, 0),
      cost_usd: rows.reduce((sum, row) => sum + row.cost_usd, 0),
      requests: rows.length,
      cache_hits: rows.filter((row) => row.cache_hit).length,
    };
  }
}
