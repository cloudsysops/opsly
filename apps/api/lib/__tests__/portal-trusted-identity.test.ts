import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveTrustedPortalSession,
  tenantSlugMatchesSession,
} from "../portal-trusted-identity";
import * as portalAuth from "../portal-auth";
import * as portalMe from "../portal-me";

vi.mock("../portal-auth", () => ({
  getUserFromAuthorizationHeader: vi.fn(),
}));

vi.mock("../portal-me", async () => {
  const actual =
    await vi.importActual<typeof import("../portal-me")>("../portal-me");
  return {
    ...actual,
    fetchPortalTenantRowBySlug: vi.fn(),
  };
});

const tenantRow = {
  id: "uuid-1",
  slug: "acme",
  name: "Acme",
  owner_email: "owner@acme.com",
  plan: "startup" as const,
  status: "active" as const,
  services: {},
  created_at: "2026-01-01",
};

describe("resolveTrustedPortalSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin JWT → 401", async () => {
    vi.mocked(portalAuth.getUserFromAuthorizationHeader).mockResolvedValue(
      null,
    );
    const res = await resolveTrustedPortalSession(
      new Request("http://localhost/x", { method: "POST" }),
    );
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected failure");
    expect(res.response.status).toBe(401);
  });

  it("sin tenant_slug en metadata → 403", async () => {
    vi.mocked(portalAuth.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      user_metadata: {},
      app_metadata: {},
    } as never);
    const res = await resolveTrustedPortalSession(
      new Request("http://localhost/x", { method: "POST" }),
    );
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected failure");
    expect(res.response.status).toBe(403);
  });

  it("tenant inexistente → 404", async () => {
    vi.mocked(portalAuth.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      email: "owner@acme.com",
      user_metadata: { tenant_slug: "acme" },
    } as never);
    vi.mocked(portalMe.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: false,
      reason: "not_found",
    });
    const res = await resolveTrustedPortalSession(
      new Request("http://localhost/x", { method: "POST" }),
    );
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected failure");
    expect(res.response.status).toBe(404);
  });

  it("error DB → 500", async () => {
    vi.mocked(portalAuth.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      email: "owner@acme.com",
      user_metadata: { tenant_slug: "acme" },
    } as never);
    vi.mocked(portalMe.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: false,
      reason: "db",
    });
    const res = await resolveTrustedPortalSession(
      new Request("http://localhost/x", { method: "POST" }),
    );
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected failure");
    expect(res.response.status).toBe(500);
  });

  it("email no es owner → 403", async () => {
    vi.mocked(portalAuth.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "u1",
      email: "x@evil.com",
      user_metadata: { tenant_slug: "acme" },
    } as never);
    vi.mocked(portalMe.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: true,
      row: tenantRow,
    });
    const res = await resolveTrustedPortalSession(
      new Request("http://localhost/x", { method: "POST" }),
    );
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected failure");
    expect(res.response.status).toBe(403);
  });

  it("éxito: expone user y tenant en session", async () => {
    vi.mocked(portalAuth.getUserFromAuthorizationHeader).mockResolvedValue({
      id: "user-id-1",
      email: "owner@acme.com",
      user_metadata: { tenant_slug: "acme" },
    } as never);
    vi.mocked(portalMe.fetchPortalTenantRowBySlug).mockResolvedValue({
      ok: true,
      row: tenantRow,
    });
    const res = await resolveTrustedPortalSession(
      new Request("http://localhost/x", { method: "POST" }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected success");
    expect(res.session.user.id).toBe("user-id-1");
    expect(res.session.tenant.slug).toBe("acme");
    expect(res.session.tenant.owner_email).toBe("owner@acme.com");
  });
});

describe("tenantSlugMatchesSession", () => {
  it("true cuando el slug coincide con el tenant de la sesión", () => {
    const session = {
      user: {} as never,
      tenant: {
        id: "uuid-1",
        slug: "acme",
        name: "Acme",
        owner_email: "owner@acme.com",
        plan: "startup" as const,
        status: "active" as const,
        services: {},
        created_at: "2026-01-01",
      },
    };
    expect(tenantSlugMatchesSession(session, "acme")).toBe(true);
  });

  it("false cuando el slug no coincide", () => {
    const session = {
      user: {} as never,
      tenant: {
        id: "uuid-1",
        slug: "acme",
        name: "Acme",
        owner_email: "owner@acme.com",
        plan: "startup" as const,
        status: "active" as const,
        services: {},
        created_at: "2026-01-01",
      },
    };
    expect(tenantSlugMatchesSession(session, "other")).toBe(false);
  });
});
