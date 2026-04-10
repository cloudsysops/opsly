import { describe, expect, it } from "vitest";
import {
    TenantContextMissingError,
    getTenantContext,
    runWithTenantContext,
    tryGetTenantContext,
} from "../tenant-context";

describe("tenant-context", () => {
  it("getTenantContext lanza fuera de run", () => {
    expect(() => getTenantContext()).toThrow(TenantContextMissingError);
  });

  it("tryGetTenantContext devuelve null fuera de run", () => {
    expect(tryGetTenantContext()).toBeNull();
  });

  it("runWithTenantContext expone id y slug", async () => {
    await runWithTenantContext(
      { tenantId: "tid", tenantSlug: "acme" },
      async () => {
        expect(getTenantContext()).toEqual({
          tenantId: "tid",
          tenantSlug: "acme",
        });
      },
    );
  });
});
