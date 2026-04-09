import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as portalMeGet } from "../me/route";
import { POST as portalModePost } from "../mode/route";
import { GET as portalTenantSlugUsageGet } from "../tenant/[slug]/usage/route";
import { GET as portalTenantSlugUsageGet } from "../tenant/[slug]/usage/route";
import { GET as portalUsageGet } from "../usage/route";
import * as portalAuthMod from "../../../../lib/portal-auth";
import * as portalMeLib from "../../../../lib/portal-me";
import * as supabaseMod from "../../../../lib/supabase";
import * as llmLogger from "@intcloudsysops/llm-gateway/logger";

vi.mock("@intcloudsysops/llm-gateway/logger", () => ({
  getTenantUsage: vi.fn(),
}));

vi.mock("../../../../lib/portal-auth", () => ({
  getUserFromAuthorizationHeader: vi.fn(),
}));

vi.mock("../../../../lib/portal-me", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../../lib/portal-me")>();
  return {
    ...actual,
    fetchPortalTenantRowBySlug: vi.fn(),
    portalUrlReachable: vi.fn(),
  };
});

vi.mock("../../../../lib/supabase", () => ({
  getServiceClient: vi.fn(),
}));

const row = {
  id: "t-1",
  slug: "acme",
  name: "Acme",
  owner_email: "owner@acme.com",
  plan: "demo",
  status: "active",
  services: { n8n: "https://n8n.test" },
  created_at: "2026-01-01",
};

describe("GET /api/portal/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(portalMeLib.portalUrlReachable).mockResolvedValue(false);
  });

  it("returns 401 when no user", async () => {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue(
      null,
    );
    const res = await portalMeGet(new Request("http://x"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no tenant slug", async () => {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      email: "o@a.com",
      user_metadata: {},
      app_metadata: {},
    } as never);
    const res = await portalMeGet(
      new Request("http://x", { headers: { authorization: "Bearer j" } }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when tenant not found", async () => {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      email: "owner@acme.com",
      user_metadata: { tenant_slug: "acme" },
    } as never);
    vi.mocked(portalMeLib.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: false,
      reason: "not_found",
    });
    const res = await portalMeGet(
      new Request("http://x", { headers: { authorization: "Bearer j" } }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 500 when db error on lookup", async () => {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      email: "owner@acme.com",
      user_metadata: { tenant_slug: "acme" },
    } as never);
    vi.mocked(portalMeLib.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: false,
      reason: "db",
    });
    const res = await portalMeGet(
      new Request("http://x", { headers: { authorization: "Bearer j" } }),
    );
    expect(res.status).toBe(500);
  });

  it("returns 403 when email does not match owner", async () => {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      email: "other@evil.com",
      user_metadata: { tenant_slug: "acme" },
    } as never);
    vi.mocked(portalMeLib.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: true,
      row,
    });
    const res = await portalMeGet(
      new Request("http://x", { headers: { authorization: "Bearer j" } }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 200 with tenant payload when owner matches", async () => {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      email: "owner@acme.com",
      user_metadata: { tenant_slug: "acme", mode: "developer" },
    } as never);
    vi.mocked(portalMeLib.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: true,
      row,
    });
    vi.mocked(portalMeLib.portalUrlReachable).mockResolvedValue(true);

    const res = await portalMeGet(
      new Request("http://x", { headers: { authorization: "Bearer j" } }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.slug).toBe("acme");
    expect(body.mode).toBe("developer");
    const health = body.health as { n8n_reachable: boolean };
    expect(health.n8n_reachable).toBe(true);
  });
});

describe("POST /api/portal/mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /** Sesión válida para `resolveTrustedPortalSession` (tenant + owner). */
  function mockValidPortalModeSession() {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      email: "owner@acme.com",
      user_metadata: { tenant_slug: "acme", theme: "dark" },
    } as never);
    vi.mocked(portalMeLib.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: true,
      row,
    });
  }

  it("returns 401 without user", async () => {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue(
      null,
    );
    const res = await portalModePost(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ mode: "managed" }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no tenant slug", async () => {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      email: "owner@acme.com",
      user_metadata: {},
    } as never);
    const res = await portalModePost(
      new Request("http://x", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "managed" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid JSON", async () => {
    mockValidPortalModeSession();
    const res = await portalModePost(
      new Request("http://x", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "(",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid mode", async () => {
    mockValidPortalModeSession();
    const res = await portalModePost(
      new Request("http://x", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "invalid" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 500 when Supabase admin update fails", async () => {
    mockValidPortalModeSession();
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      auth: {
        admin: {
          updateUserById: vi
            .fn()
            .mockResolvedValue({ error: { message: "admin api down" } }),
        },
      },
    } as never);

    const res = await portalModePost(
      new Request("http://x", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "managed" }),
      }),
    );
    expect(res.status).toBe(500);
  });

  it("returns 200 when mode updates", async () => {
    mockValidPortalModeSession();
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      auth: {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    } as never);

    const res = await portalModePost(
      new Request("http://x", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "developer" }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("developer");
  });
});

describe("GET /api/portal/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockValidPortalUsageSession() {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      email: "owner@acme.com",
      user_metadata: { tenant_slug: "acme" },
    } as never);
    vi.mocked(portalMeLib.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: true,
      row,
    });
  }

  it("returns 401 without user", async () => {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue(
      null,
    );
    const res = await portalUsageGet(
      new NextRequest("http://localhost/api/portal/usage"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 200 with usage for session tenant only", async () => {
    mockValidPortalUsageSession();
    vi.mocked(llmLogger.getTenantUsage).mockResolvedValue({
      tokens_input: 10,
      tokens_output: 20,
      cost_usd: 0.01,
      requests: 2,
      cache_hits: 1,
    });

    const res = await portalUsageGet(
      new NextRequest("http://localhost/api/portal/usage?period=month", {
        headers: { authorization: "Bearer t" },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.tenant).toBe("acme");
    expect(body.period).toBe("month");
    expect(body.requests).toBe(2);
    expect(body.cache_hit_rate).toBe(50);
    expect(llmLogger.getTenantUsage).toHaveBeenCalledWith("acme", "month");
  });
});

describe("GET /api/portal/tenant/[slug]/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockValidPortalUsageSession() {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      email: "owner@acme.com",
      user_metadata: { tenant_slug: "acme" },
    } as never);
    vi.mocked(portalMeLib.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: true,
      row,
    });
  }

  it("returns 401 without user", async () => {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue(
      null,
    );
    const res = await portalTenantSlugUsageGet(
      new NextRequest("http://localhost/api/portal/tenant/acme/usage"),
      { params: Promise.resolve({ slug: "acme" }) },
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when path slug does not match session tenant", async () => {
    mockValidPortalUsageSession();
    const res = await portalTenantSlugUsageGet(
      new NextRequest("http://localhost/api/portal/tenant/other/usage", {
        headers: { authorization: "Bearer t" },
      }),
      { params: Promise.resolve({ slug: "other" }) },
    );
    expect(res.status).toBe(403);
    expect(llmLogger.getTenantUsage).not.toHaveBeenCalled();
  });

  it("returns 200 and usage when slug matches session", async () => {
    mockValidPortalUsageSession();
    vi.mocked(llmLogger.getTenantUsage).mockResolvedValue({
      tokens_input: 1,
      tokens_output: 2,
      cost_usd: 0,
      requests: 1,
      cache_hits: 0,
    });

    const res = await portalTenantSlugUsageGet(
      new NextRequest("http://localhost/api/portal/tenant/acme/usage", {
        headers: { authorization: "Bearer t" },
      }),
      { params: Promise.resolve({ slug: "acme" }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.tenant).toBe("acme");
    expect(body.period).toBe("today");
    expect(llmLogger.getTenantUsage).toHaveBeenCalledWith("acme", "today");
  });
});
