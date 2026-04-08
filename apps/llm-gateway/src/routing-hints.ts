import type { RoutingPreference } from "./providers.js";

/** Sesgo sobre la preferencia inferida por complejidad (sin `model` explícito). */
export type RoutingBias = "cost" | "balanced" | "quality";

/**
 * Ajusta la preferencia base (sonnet/haiku/cheap) cuando el caller no fijó `model`.
 * `balanced` es no-op. No sustituye `model` explícito en `LLMRequest`.
 */
export function applyRoutingBias(
  base: RoutingPreference,
  level: 1 | 2 | 3,
  bias: RoutingBias,
): RoutingPreference {
  if (bias === "balanced") {
    return base;
  }
  if (bias === "cost") {
    if (level === 3 && base === "sonnet") {
      return "haiku";
    }
    if (level === 2 && base === "haiku") {
      return "cheap";
    }
    return base;
  }
  if (level === 1 && base === "cheap") {
    return "haiku";
  }
  if (level === 2 && base === "haiku") {
    return "sonnet";
  }
  return base;
}

function parseBiasRaw(raw: string | null): RoutingBias | undefined {
  if (!raw) {
    return undefined;
  }
  const v = raw.trim().toLowerCase();
  if (v === "cost" || v === "quality" || v === "balanced") {
    return v;
  }
  return undefined;
}

/**
 * Extrae hints de routing desde query string (p. ej. Route Handlers de Next.js).
 * Claves: `llm_model` o `model`; `llm_routing` o `routing_bias`.
 */
export function parseLlmGatewayRoutingParams(searchParams: URLSearchParams): {
  model?: string;
  routing_bias?: RoutingBias;
} {
  const modelRaw = searchParams.get("llm_model") ?? searchParams.get("model");
  const model = modelRaw && modelRaw.trim() !== "" ? modelRaw.trim() : undefined;
  const biasRaw = searchParams.get("llm_routing") ?? searchParams.get("routing_bias");
  const routing_bias = parseBiasRaw(biasRaw);
  return {
    ...(model !== undefined ? { model } : {}),
    ...(routing_bias !== undefined ? { routing_bias } : {}),
  };
}

/**
 * Mismos hints vía cabeceras (útil para proxies o clientes que no alteran query).
 * `x-llm-model`, `x-llm-routing`.
 */
export function parseLlmGatewayRoutingHeaders(headers: Headers): {
  model?: string;
  routing_bias?: RoutingBias;
} {
  const modelRaw = headers.get("x-llm-model") ?? headers.get("X-Llm-Model");
  const model = modelRaw && modelRaw.trim() !== "" ? modelRaw.trim() : undefined;
  const biasRaw = headers.get("x-llm-routing") ?? headers.get("X-Llm-Routing");
  const routing_bias = parseBiasRaw(biasRaw);
  return {
    ...(model !== undefined ? { model } : {}),
    ...(routing_bias !== undefined ? { routing_bias } : {}),
  };
}
