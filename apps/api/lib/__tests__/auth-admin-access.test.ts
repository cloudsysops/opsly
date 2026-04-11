import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveSuperAdminSession = vi.fn();

vi.mock("../super-admin-auth", () => ({
  resolveSuperAdminSession,
}));

describe("admin auth access", () => {
  beforeEach(() => {
    resolveSuperAdminSession.mockReset();
    process.env.ADMIN_PUBLIC_DEMO_READ = "false";
    process.env.PLATFORM_ADMIN_TOKEN = "opsly-admin-token";
  });

  it("accepts the legacy admin token", async () => {
    const { requireAdminAccess } = await import("../auth");
    const request = new Request("https://opsly.test/api/admin/costs", {
      method: "POST",
      headers: {
        Authorization: "Bearer opsly-admin-token",
      },
    });

    await expect(requireAdminAccess(request)).resolves.toBeNull();
    expect(resolveSuperAdminSession).not.toHaveBeenCalled();
  });

  it("accepts a resolved super admin session", async () => {
    resolveSuperAdminSession.mockResolvedValue({ ok: true, user: { id: "u1" } });
    const { requireAdminAccess } = await import("../auth");
    const request = new Request("https://opsly.test/api/admin/costs", {
      method: "POST",
      headers: {
        Authorization: "Bearer session-jwt",
      },
    });

    await expect(requireAdminAccess(request)).resolves.toBeNull();
    expect(resolveSuperAdminSession).toHaveBeenCalledOnce();
  });

  it("allows public demo GETs without auth", async () => {
    process.env.ADMIN_PUBLIC_DEMO_READ = "true";
    const { requireAdminAccessUnlessDemoRead } = await import("../auth");
    const request = new Request("https://opsly.test/api/metrics", {
      method: "GET",
    });

    await expect(requireAdminAccessUnlessDemoRead(request)).resolves.toBeNull();
    expect(resolveSuperAdminSession).not.toHaveBeenCalled();
  });

  it("returns the super admin auth failure when token does not match", async () => {
    const forbidden = new Response("Forbidden", { status: 403 });
    resolveSuperAdminSession.mockResolvedValue({ ok: false, response: forbidden });
    const { requireAdminAccess } = await import("../auth");
    const request = new Request("https://opsly.test/api/admin/costs", {
      method: "POST",
      headers: {
        Authorization: "Bearer wrong-token",
      },
    });

    await expect(requireAdminAccess(request)).resolves.toBe(forbidden);
    expect(resolveSuperAdminSession).toHaveBeenCalledOnce();
  });
});
