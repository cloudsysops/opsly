import { scheduleMeteringProcessing } from "./metering-record";
import type { BillingMetricType, MeteringOperationKind } from "./types";

export interface MeteringRouteOptions {
  readonly resolveTenantId: (request: Request) => string | null;
  readonly operation: string;
  readonly kind: MeteringOperationKind;
  readonly resolveMetricType: (request: Request, response: Response) => BillingMetricType;
  readonly resolveQuantity?: (request: Request, response: Response) => number;
  readonly persistLine?: boolean;
  readonly unitCostUsd?: number;
}

/**
 * Wrapper para route handlers (Next.js App Router): tras respuesta **2xx**, agenda medición async.
 * No sustituye `middleware.ts` global de CORS: es composición a nivel de handler costoso.
 */
export function withMetering<TContext>(
  handler: (request: Request, context: TContext) => Promise<Response>,
  options: MeteringRouteOptions,
): (request: Request, context: TContext) => Promise<Response> {
  return async (request: Request, context: TContext): Promise<Response> => {
    const response = await handler(request, context);
    if (response.ok) {
      const tenantId = options.resolveTenantId(request);
      if (tenantId) {
        const metricType = options.resolveMetricType(request, response);
        const quantity = options.resolveQuantity?.(request, response) ?? 1;
        const requestId = request.headers.get("x-request-id") ?? undefined;
        scheduleMeteringProcessing(
          {
            tenantId,
            metricType,
            quantity,
            operation: options.operation,
            kind: options.kind,
            requestId,
          },
          {
            persistLine: options.persistLine,
            unitCostUsd: options.unitCostUsd,
          },
        );
      }
    }
    return response;
  };
}
