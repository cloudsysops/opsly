import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "../route";

describe("GET /api/health", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("returns ok payload with redis skipped when REDIS_URL unset", async () => {
    delete process.env.REDIS_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("ok");
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("version");
    const checks = body.checks as Record<string, string>;
    expect(checks.redis).toBe("skipped");
    expect(checks.supabase).toBe("ok");
  });

  it("marks redis ok when REDIS_URL is set", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 200 }),
    );

    const res = await GET();
    const body = (await res.json()) as Record<string, unknown>;
    const checks = body.checks as Record<string, string>;
    expect(checks.redis).toBe("ok");
  });

  it("uses SUPABASE_URL when NEXT_PUBLIC missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_URL = "https://fallback.supabase.co/";
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    const res = await GET();
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.checks as { supabase: string }).supabase).toBe("ok");
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain(
      "https://fallback.supabase.co/auth/v1/health",
    );
  });

  it("returns supabase error when no URL configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;

    const res = await GET();
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.checks as { supabase: string }).supabase).toBe("error");
  });

  it("returns degraded when auth health not ok", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));

    const res = await GET();
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.checks as { supabase: string }).supabase).toBe("degraded");
  });

  it("returns degraded when fetch throws", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    vi.mocked(fetch).mockRejectedValue(new Error("econnrefused"));

    const res = await GET();
    const body = (await res.json()) as Record<string, unknown>;
    expect((body.checks as { supabase: string }).supabase).toBe("degraded");
  });

  it("trims trailing slash from supabase URL", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co///";
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await GET();
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      "https://proj.supabase.co/auth/v1/health",
    );
  });

  it("still returns top-level status ok when a check is degraded", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));

    const res = await GET();
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("ok");
    expect((body.checks as { supabase: string }).supabase).toBe("degraded");
  });
});
