import { describe, expect, it } from "vitest";

import { TenantBootstrapper } from "../tenant-bootstrapper";

describe("TenantBootstrapper", () => {
  it("provisionResources despliega 2 workers simulados", async () => {
    const b = new TenantBootstrapper();
    const r = await b.provisionResources("550e8400-e29b-41d4-a716-446655440000");
    expect(r.workersDeployed).toBe(2);
    expect(r.job.workersRequested).toBe(2);
    expect(r.job.provider).toBe("kubernetes");
    expect(r.job.jobName).toContain("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rechaza tenantId vacío", async () => {
    const b = new TenantBootstrapper();
    await expect(b.provisionResources("  ")).rejects.toThrow("tenantId");
  });
});
