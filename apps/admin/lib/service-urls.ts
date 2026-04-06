import type { Json } from "./types";

/** Ruta típica de status page en Uptime Kuma (puede requerir ajuste según instancia). */
export function uptimeStatusPageUrl(
  uptimeBaseUrl: string,
  tenantSlug: string,
): string {
  const base = uptimeBaseUrl.replace(/\/$/, "");
  return `${base}/status/${tenantSlug}`;
}

export function parseServiceUrls(services: Json): {
  n8n: string | null;
  uptime: string | null;
} {
  if (
    services === null ||
    typeof services !== "object" ||
    Array.isArray(services)
  ) {
    return { n8n: null, uptime: null };
  }
  const o = services as Record<string, unknown>;
  const n8n = typeof o.n8n === "string" ? o.n8n : null;
  const uptime = typeof o.uptime_kuma === "string" ? o.uptime_kuma : null;
  return { n8n, uptime };
}
