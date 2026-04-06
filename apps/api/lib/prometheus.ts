const QUERY_TIMEOUT_MS = 8_000;

export type PromVectorResult = {
  status: "success" | "error";
  data?: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      value: [number, string];
    }>;
  };
  error?: string;
};

function parsePromJson(text: string): PromVectorResult | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      !("status" in parsed) ||
      typeof (parsed as { status: unknown }).status !== "string"
    ) {
      return null;
    }
    return parsed as PromVectorResult;
  } catch {
    return null;
  }
}

/** Suma valores de un instant vector; si hay varias series, promedia (p. ej. CPU por core). */
export function aggregateInstantVector(
  payload: PromVectorResult,
  mode: "sum" | "avg",
): number | null {
  if (payload.status !== "success" || payload.data?.resultType !== "vector") {
    return null;
  }
  const result = payload.data.result;
  if (result.length === 0) {
    return null;
  }
  const nums: number[] = [];
  for (const row of result) {
    const n = Number(row.value[1]);
    if (!Number.isNaN(n)) {
      nums.push(n);
    }
  }
  if (nums.length === 0) {
    return null;
  }
  if (mode === "sum") {
    return nums.reduce((a, b) => a + b, 0);
  }
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function promInstantQuery(
  baseUrl: string,
  query: string,
): Promise<PromVectorResult | null> {
  const trimmed = baseUrl.replace(/\/$/, "");
  const url = new URL("/api/v1/query", `${trimmed}/`);
  url.searchParams.set("query", query);
  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
    });
    if (!res.ok) {
      return null;
    }
    const text = await res.text();
    return parsePromJson(text);
  } catch {
    return null;
  }
}

export function getPrometheusBaseUrl(): string {
  const fromEnv = process.env.PROMETHEUS_BASE_URL;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  return "http://127.0.0.1:9090";
}
