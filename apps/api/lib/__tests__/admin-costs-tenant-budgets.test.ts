import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockOrder,
  mockLimit,
  mockIs,
  mockSelect,
  mockFrom,
  mockSchema,
  mockCheckTenantBudget,
  mockLoggerError,
} = vi.hoisted(() => {
  const mockOrder = vi.fn();
  const mockLimit = vi.fn();
  const mockIs = vi.fn();
  const mockSelect = vi.fn();
  const mockFrom = vi.fn();
  const mockSchema = vi.fn(() => ({ from: mockFrom }));
  const mockCheckTenantBudget = vi.fn();
  const mockLoggerError = vi.fn();
  return {
    mockOrder,
    mockLimit,
    mockIs,
    mockSelect,
    mockFrom,
    mockSchema,
    mockCheckTenantBudget,
    mockLoggerError,
  };
});

vi.mock("../supabase", () => ({
  getServiceClient: () => ({
    schema: mockSchema,
  }),
}));

vi.mock("../billing/budget-enforcer", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../billing/budget-enforcer")>();
  return {
    ...actual,
    checkTenantBudget: mockCheckTenantBudget,
  };
});

vi.mock("../logger", () => ({
  logger: {
    error: mockLoggerError,
  },
}));

import { fetchTenantBudgetOverview } from "../admin-costs-tenant-budgets";

function mockTenantList(rows: Array<{ id: string; slug: string; name: string }>) {
  mockFrom.mockReturnValue({
    select: mockSelect.mockReturnThis(),
    is: mockIs.mockReturnThis(),
    order: mockOrder.mockReturnThis(),
    limit: mockLimit.mockResolvedValue({ data: rows, error: null }),
  });
}

describe("fetchTenantBudgetOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts warning and critical tenants even when enforcement is skipped", async () => {
    mockTenantList([
      { id: "t-1", slug: "ops", name: "Ops" },
      { id: "t-2", slug: "acme", name: "Acme" },
    ]);

    mockCheckTenantBudget
      .mockResolvedValueOnce({
        currentSpend: 95,
        limit: 100,
        enforcementSkipped: true,
      })
      .mockResolvedValueOnce({
        currentSpend: 80,
        limit: 100,
        enforcementSkipped: false,
      });

    const payload = await fetchTenantBudgetOverview();

    expect(payload.tenant_budgets).toHaveLength(2);
    expect(payload.tenant_budgets[0]).toMatchObject({
      tenant_slug: "ops",
      alert_level: "critical",
      enforcement_skipped: true,
    });
    expect(payload.llm_budget_summary).toMatchObject({
      tenant_count: 2,
      tenants_at_warning: 1,
      tenants_at_critical: 1,
      total_spend_usd: 175,
    });
  });

  it("logs and skips a tenant when budget lookup fails", async () => {
    mockTenantList([{ id: "t-1", slug: "ops", name: "Ops" }]);
    mockCheckTenantBudget.mockRejectedValue(new Error("boom"));

    const payload = await fetchTenantBudgetOverview();

    expect(payload.tenant_budgets).toEqual([]);
    expect(payload.llm_budget_summary.tenant_count).toBe(0);
    expect(mockLoggerError).toHaveBeenCalledWith(
      "admin costs tenant budget check failed",
      expect.objectContaining({
        tenantId: "t-1",
        tenantSlug: "ops",
        error: "boom",
      }),
    );
  });
});
