import {
  aiModelCostMultiplier,
  BILLING_METER_UNIT_COST_USD,
} from "../billing-meter-pricing";
import { runWithMeteringTenantContext } from "../metering-tenant-context";
import { UsageRepository } from "../repositories/usage-repository";
import type { Json } from "../supabase/types";

function logMeteringError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[BillingMeterService] ${context}: ${message}`);
}

/**
 * Punto central para registrar consumo facturable (`platform.usage_events`).
 * Requiere contexto ALS (`runTrustedPortalDal`) o resolución explícita por `tenantSlug`.
 */
export class BillingMeterService {
  /**
   * Registra uso de tokens LLM. Coste = (input+output) × precio base × multiplicador de modelo.
   */
  static async trackAIUsage(
    tenantSlug: string,
    inputTokens: number,
    outputTokens: number,
    modelName: string,
    options?: { tenantId?: string; metadata?: Json },
  ): Promise<void> {
    const totalTokens = Math.max(0, inputTokens) + Math.max(0, outputTokens);
    const unitCostUsd =
      BILLING_METER_UNIT_COST_USD.AI_TOKEN * aiModelCostMultiplier(modelName);

    await runWithMeteringTenantContext(
      tenantSlug,
      async () => {
        const repo = new UsageRepository();
        await repo.recordEvent({
          eventType: "ai_tokens",
          quantity: totalTokens,
          unitCostUsd,
          tokensInput: Math.max(0, inputTokens),
          tokensOutput: Math.max(0, outputTokens),
          model: modelName,
          metadata: options?.metadata,
        });
      },
      { tenantId: options?.tenantId },
    );
  }

  /**
   * Registra tiempo de CPU / worker en segundos.
   */
  static async trackWorkerExecution(
    tenantSlug: string,
    durationSeconds: number,
    options?: { tenantId?: string; metadata?: Json },
  ): Promise<void> {
    const seconds = Math.max(0, durationSeconds);

    await runWithMeteringTenantContext(
      tenantSlug,
      async () => {
        const repo = new UsageRepository();
        await repo.recordEvent({
          eventType: "cpu_time",
          quantity: seconds,
          metadata: options?.metadata,
          model: "meter:worker_cpu",
        });
      },
      { tenantId: options?.tenantId },
    );
  }

  /**
   * Fire-and-forget: no bloquea la respuesta HTTP; errores solo en logs.
   */
  static trackAIUsageFireAndForget(
    tenantSlug: string,
    inputTokens: number,
    outputTokens: number,
    modelName: string,
    options?: { tenantId?: string; metadata?: Json },
  ): void {
    setImmediate(() => {
      void BillingMeterService.trackAIUsage(
        tenantSlug,
        inputTokens,
        outputTokens,
        modelName,
        options,
      ).catch((err: unknown) => {
        logMeteringError("trackAIUsage", err);
      });
    });
  }

  static trackWorkerExecutionFireAndForget(
    tenantSlug: string,
    durationSeconds: number,
    options?: { tenantId?: string; metadata?: Json },
  ): void {
    setImmediate(() => {
      void BillingMeterService.trackWorkerExecution(
        tenantSlug,
        durationSeconds,
        options,
      ).catch((err: unknown) => {
        logMeteringError("trackWorkerExecution", err);
      });
    });
  }
}

/**
 * Ejemplo (handler de API tras `runTrustedPortalDal` — el ALS ya trae tenant):
 *
 * ```ts
 * export async function POST(request: Request) {
 *   const session = await resolveTrustedPortalSession(request);
 *   if (!session.ok) return session.response;
 *   const { slug, id } = session.session.tenant;
 *
 *   const body = await request.json();
 *   // ... ejecutar agente LLM y obtener tokens ...
 *
 *   BillingMeterService.trackAIUsageFireAndForget(
 *     slug,
 *     body.inputTokens,
 *     body.outputTokens,
 *     body.model ?? "gpt-4o",
 *     { tenantId: id },
 *   );
 *
 *   return Response.json({ ok: true });
 * }
 * ```
 *
 * Worker BullMQ sin request: usa solo `tenantSlug` (resuelve id en DB):
 *
 * ```ts
 * await BillingMeterService.trackWorkerExecution("acme-corp", 12.5);
 * ```
 */
