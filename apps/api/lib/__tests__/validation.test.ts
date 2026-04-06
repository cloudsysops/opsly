import { describe, it, expect } from "vitest";
import {
  CreateTenantSchema,
  formatZodError,
  ListTenantsQuerySchema,
  TenantRefParamSchema,
  UpdateTenantSchema,
} from "../validation";

describe("CreateTenantSchema", () => {
  it("accepts a minimal valid payload", () => {
    const parsed = CreateTenantSchema.safeParse({
      slug: "acme-corp",
      owner_email: "owner@acme.com",
      plan: "startup",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects slug shorter than 3 chars", () => {
    const parsed = CreateTenantSchema.safeParse({
      slug: "ab",
      owner_email: "o@a.com",
      plan: "demo",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects slug with uppercase", () => {
    const parsed = CreateTenantSchema.safeParse({
      slug: "Acme-corp",
      owner_email: "o@a.com",
      plan: "demo",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const parsed = CreateTenantSchema.safeParse({
      slug: "valid-slug",
      owner_email: "not-an-email",
      plan: "business",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown plan", () => {
    const parsed = CreateTenantSchema.safeParse({
      slug: "valid-slug",
      owner_email: "o@a.com",
      plan: "starter",
    });
    expect(parsed.success).toBe(false);
  });

  it("optional stripe_customer_id must be non-empty when present", () => {
    const parsed = CreateTenantSchema.safeParse({
      slug: "valid-slug",
      owner_email: "o@a.com",
      plan: "enterprise",
      stripe_customer_id: "",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("ListTenantsQuerySchema", () => {
  it("applies defaults for empty input", () => {
    const parsed = ListTenantsQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.limit).toBeGreaterThan(0);
    }
  });

  it("coerces string numbers from query params", () => {
    const parsed = ListTenantsQuerySchema.safeParse({ page: "2", limit: "5" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(2);
      expect(parsed.data.limit).toBe(5);
    }
  });

  it("rejects page below 1", () => {
    const parsed = ListTenantsQuerySchema.safeParse({ page: 0 });
    expect(parsed.success).toBe(false);
  });

  it("rejects limit above MAX_LIMIT", () => {
    const parsed = ListTenantsQuerySchema.safeParse({ limit: 999 });
    expect(parsed.success).toBe(false);
  });

  it("accepts optional status and plan", () => {
    const parsed = ListTenantsQuerySchema.safeParse({
      status: "active",
      plan: "demo",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("TenantRefParamSchema", () => {
  it("accepts UUID", () => {
    const parsed = TenantRefParamSchema.safeParse(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(parsed.success).toBe(true);
  });

  it("accepts slug form", () => {
    expect(TenantRefParamSchema.safeParse("acme").success).toBe(true);
    expect(TenantRefParamSchema.safeParse("acme-corp").success).toBe(true);
  });

  it("rejects slug with underscore", () => {
    expect(TenantRefParamSchema.safeParse("acme_corp").success).toBe(false);
  });

  it("rejects slug that looks like invalid segment", () => {
    expect(TenantRefParamSchema.safeParse("ab").success).toBe(false);
  });
});

describe("UpdateTenantSchema", () => {
  it("requires at least one field", () => {
    expect(UpdateTenantSchema.safeParse({}).success).toBe(false);
  });

  it("accepts name only", () => {
    const parsed = UpdateTenantSchema.safeParse({ name: "New name" });
    expect(parsed.success).toBe(true);
  });

  it("accepts plan only", () => {
    const parsed = UpdateTenantSchema.safeParse({ plan: "demo" });
    expect(parsed.success).toBe(true);
  });
});

describe("formatZodError", () => {
  it("joins issues with semicolons", () => {
    const r = CreateTenantSchema.safeParse({});
    expect(r.success).toBe(false);
    if (!r.success) {
      const msg = formatZodError(r.error);
      expect(msg).toContain(";");
      expect(msg.length).toBeGreaterThan(10);
    }
  });
});
