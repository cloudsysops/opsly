import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../lib/auth", () => ({
  requireAdminAccess: vi.fn(),
}));

import { requireAdminAccess } from "../../../../lib/auth";
import { POST } from "../route";

describe("POST /api/backup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns auth failure when admin access is rejected", async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(
      Response.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const res = await POST(new Request("http://localhost/api/backup", { method: "POST" }));

    expect(res.status).toBe(401);
  });

  it("returns 501 with manual backup guidance", async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(null);

    const res = await POST(new Request("http://localhost/api/backup", { method: "POST" }));

    expect(res.status).toBe(501);
    await expect(res.json()).resolves.toEqual({
      error:
        "Backup API not implemented yet. Use scripts/backup-tenants.sh until the API runner is available.",
    });
  });
});
