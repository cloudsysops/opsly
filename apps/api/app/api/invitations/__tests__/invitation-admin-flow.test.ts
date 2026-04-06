import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeAdminInvitation } from "../../../../lib/invitation-admin-flow";
import * as supabaseMod from "../../../../lib/supabase";
import * as portalInvMod from "../../../../lib/portal-invitations";

vi.mock("../../../../lib/supabase", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("../../../../lib/portal-invitations", () => ({
  sendPortalInvitationForTenant: vi.fn(),
}));

const activeTenant = {
  id: "t1",
  slug: "acme",
  name: "Acme",
  owner_email: "owner@acme.com",
  status: "active",
};

function mockClientForTenant(
  tenant: typeof activeTenant | null,
  queryError: unknown = null,
): ReturnType<typeof supabaseMod.getServiceClient> {
  const chain = {
    schema: () => chain,
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    maybeSingle: () => Promise.resolve({ data: tenant, error: queryError }),
  };
  return chain as ReturnType<typeof supabaseMod.getServiceClient>;
}

describe("executeAdminInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with link and token when valid", async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockClientForTenant(activeTenant),
    );
    vi.mocked(portalInvMod.sendPortalInvitationForTenant).mockResolvedValue({
      link: "https://portal.example/invite/tok?email=o%40a.com",
      token: "jwt-like-token-value-here-for-test",
    });

    const res = await executeAdminInvitation({
      tenantRef: "acme",
      email: "owner@acme.com",
      mode: "developer",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.token).toBe("jwt-like-token-value-here-for-test");
    expect(portalInvMod.sendPortalInvitationForTenant).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "developer" }),
    );
  });

  it("returns 404 when tenant is missing", async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockClientForTenant(null),
    );
    const res = await executeAdminInvitation({
      tenantRef: "missing",
      email: "owner@acme.com",
    });
    expect(res.status).toBe(404);
  });

  it("returns 403 when email is not owner_email", async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockClientForTenant(activeTenant),
    );
    const res = await executeAdminInvitation({
      tenantRef: "acme",
      email: "other@evil.com",
    });
    expect(res.status).toBe(403);
  });

  it("returns 500 when sendPortalInvitationForTenant rejects", async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockClientForTenant(activeTenant),
    );
    vi.mocked(portalInvMod.sendPortalInvitationForTenant).mockRejectedValue(
      new Error("Resend rate limit"),
    );
    const res = await executeAdminInvitation({
      tenantRef: "acme",
      email: "owner@acme.com",
    });
    expect(res.status).toBe(500);
  });

  it("passes undefined mode when omitted", async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockClientForTenant(activeTenant),
    );
    vi.mocked(portalInvMod.sendPortalInvitationForTenant).mockResolvedValue({
      link: "https://x",
      token: "t",
    });
    await executeAdminInvitation({
      tenantRef: "acme",
      email: "owner@acme.com",
    });
    expect(portalInvMod.sendPortalInvitationForTenant).toHaveBeenCalledWith(
      expect.objectContaining({ mode: undefined }),
    );
  });

  it("returns 500 when Supabase returns query error", async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(
      mockClientForTenant(null, { code: "PGRST116", message: "x" }),
    );
    const res = await executeAdminInvitation({
      tenantRef: "acme",
      email: "owner@acme.com",
    });
    expect(res.status).toBe(500);
  });
});
