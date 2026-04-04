import type { Json } from "./types";

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
