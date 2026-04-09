import { describe, expect, it } from "vitest";
import { tenantSlugFromUserMetadata } from "../tenant";

describe("tenantSlugFromUserMetadata", () => {
  it("returns undefined for null/undefined user", () => {
    expect(tenantSlugFromUserMetadata(null)).toBeUndefined();
    expect(tenantSlugFromUserMetadata(undefined)).toBeUndefined();
  });

  it("returns undefined when user_metadata is missing or not a plain object", () => {
    expect(tenantSlugFromUserMetadata({})).toBeUndefined();
    expect(tenantSlugFromUserMetadata({ user_metadata: null })).toBeUndefined();
    expect(tenantSlugFromUserMetadata({ user_metadata: [] })).toBeUndefined();
  });

  it("returns trimmed slug when tenant_slug is a non-empty string", () => {
    expect(
      tenantSlugFromUserMetadata({
        user_metadata: { tenant_slug: "  acme  " },
      }),
    ).toBe("acme");
  });

  it("returns undefined for empty or whitespace-only tenant_slug", () => {
    expect(
      tenantSlugFromUserMetadata({ user_metadata: { tenant_slug: "" } }),
    ).toBeUndefined();
    expect(
      tenantSlugFromUserMetadata({ user_metadata: { tenant_slug: "   " } }),
    ).toBeUndefined();
  });

  it("returns undefined when tenant_slug is not a string", () => {
    expect(
      tenantSlugFromUserMetadata({
        user_metadata: { tenant_slug: 1 },
      }),
    ).toBeUndefined();
  });
});
