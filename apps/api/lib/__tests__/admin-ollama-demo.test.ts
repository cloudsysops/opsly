import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckTenantBudget = vi.fn();

vi.mock("../billing/budget-enforcer", () => ({
  checkTenantBudget: (...args: unknown[]) => mockCheckTenantBudget(...args),
}));

import { checkBudgetForOllamaDemo } from "../admin-ollama-demo";

describe("checkBudgetForOllamaDemo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when billing_usage table is missing (Supabase schema cache)", async () => {
    mockCheckTenantBudget.mockRejectedValue(
      new Error(
        "Could not find the table 'platform.billing_usage' in the schema cache",
      ),
    );

    const res = await checkBudgetForOllamaDemo("tid", "acme");
    expect(res).toBeNull();
  });

  it("returns 500 for other budget errors", async () => {
    mockCheckTenantBudget.mockRejectedValue(new Error("database offline"));

    const res = await checkBudgetForOllamaDemo("tid", "acme");
    expect(res).not.toBeNull();
    expect(res?.status).toBe(500);
  });
});
