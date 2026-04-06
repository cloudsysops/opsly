import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as portalMeGet } from "../me/route";
import { POST as portalModePost } from "../mode/route";
import * as portalAuthMod from "../../../../lib/portal-auth";
import * as portalMeLib from "../../../../lib/portal-me";
import * as supabaseMod from "../../../../lib/supabase";

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

  it("returns 400 on invalid JSON", async () => {
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
    } as never);
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
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
    } as never);
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
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      user_metadata: { x: 1 },
    } as never);
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
    vi.mocked(portalAuthMod.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      user_metadata: { theme: "dark" },
    } as never);
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
