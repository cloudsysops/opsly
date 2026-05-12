import { resolveNvidiaDefaultModel } from './providers/nvidia';

export type OpslyRouteBucket = 'auto' | 'fast' | 'coding' | 'architect' | 'security';

const ROUTE_ENV: Record<Exclude<OpslyRouteBucket, 'auto'>, string> = {
  fast: 'AI_ROUTE_FAST',
  coding: 'AI_ROUTE_CODING',
  architect: 'AI_ROUTE_ARCHITECT',
  security: 'AI_ROUTE_SECURITY',
};

export type OpslyRoutingResolution = {
  /** Model id enviado al upstream (NVIDIA / OpenRouter / etc.) */
  upstreamModel: string;
  /** Bucket ya resuelto (incluye heurística de `opsly:auto`); para cadena de proveedores */
  effectiveBucket: Exclude<OpslyRouteBucket, 'auto'>;
  /** Alias pedido por el cliente (`opsly:fast`, …) o null si era id crudo */
  clientAlias: string | null;
};

function readRouteModel(bucket: Exclude<OpslyRouteBucket, 'auto'>, fallback: string): string {
  const key = ROUTE_ENV[bucket];
  const v = process.env[key]?.trim();
  return v !== undefined && v.length > 0 ? v : fallback;
}

function lastUserContent(messages: Array<{ role: string; content: string }>): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user' && typeof messages[i]?.content === 'string') {
      return messages[i].content;
    }
  }
  return '';
}

function resolveAutoBucket(
  metadata: Record<string, unknown> | undefined,
  messages: Array<{ role: string; content: string }>
): Exclude<OpslyRouteBucket, 'auto'> {
  const hint = metadata?.opsly_route;
  if (
    typeof hint === 'string' &&
    (hint === 'fast' || hint === 'coding' || hint === 'architect' || hint === 'security')
  ) {
    return hint;
  }
  const text = lastUserContent(messages);
  const lower = text.toLowerCase();
  if (lower.includes('cve') || lower.includes('vulnerability') || lower.includes('exploit')) {
    return 'security';
  }
  if (
    lower.includes('refactor') ||
    lower.includes('implement') ||
    lower.includes('typescript') ||
    lower.includes('function ')
  ) {
    return 'coding';
  }
  if (text.length > 6000) {
    return 'architect';
  }
  return 'fast';
}

/**
 * Resuelve `opsly:*` a un id de modelo upstream usando AI_ROUTE_*.
 * Ids que no empiezan por `opsly:` se devuelven tal cual (passthrough).
 */
export function resolveOpslyRouting(input: {
  requestedModel: string | undefined;
  metadata: Record<string, unknown> | undefined;
  messages: Array<{ role: string; content: string }>;
}): OpslyRoutingResolution {
  const fallback = resolveNvidiaDefaultModel();
  const raw = input.requestedModel?.trim() ?? '';
  if (raw.length === 0) {
    return { upstreamModel: fallback, effectiveBucket: 'fast', clientAlias: null };
  }
  if (!raw.startsWith('opsly:')) {
    return { upstreamModel: raw, effectiveBucket: 'fast', clientAlias: null };
  }

  if (raw === 'opsly:auto') {
    const bucket = resolveAutoBucket(input.metadata, input.messages);
    return {
      upstreamModel: readRouteModel(bucket, fallback),
      effectiveBucket: bucket,
      clientAlias: 'opsly:auto',
    };
  }

  const aliasToBucket: Record<string, Exclude<OpslyRouteBucket, 'auto'>> = {
    'opsly:fast': 'fast',
    'opsly:coding': 'coding',
    'opsly:architect': 'architect',
    'opsly:security': 'security',
  };

  const bucket = aliasToBucket[raw];
  if (bucket !== undefined) {
    return {
      upstreamModel: readRouteModel(bucket, fallback),
      effectiveBucket: bucket,
      clientAlias: raw,
    };
  }

  return { upstreamModel: fallback, effectiveBucket: 'fast', clientAlias: raw };
}
