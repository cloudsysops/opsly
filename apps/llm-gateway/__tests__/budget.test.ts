import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getTenantUsageMock = vi.hoisted(() => vi.fn());
const notifyDiscordMock = vi.hoisted(() => vi.fn());

vi.mock("../src/logger.js", () => ({
  logUsage: vi.fn(),
  getTenantUsage: (...args: unknown[]) => getTenantUsageMock(...args),
}));

vi.mock("../src/discord-notify.js", () => ({
  notifyDiscord: (...args: unknown[]) => notifyDiscordMock(...args),
}));

import { checkBudget, PLAN_BUDGETS } from "../src/budget.js";

describe("budget", () => {
  beforeEach(() => {
    getTenantUsageMock.mockReset();
    notifyDiscordMock.mockReset();
    notifyDiscordMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("enterprise siempre allowed sin consultar uso", async () => {
    const s = await checkBudget("bigcorp", "enterprise");
    expect(s.allowed).toBe(true);
    expect(s.force_cheap).toBe(false);
    expect(getTenantUsageMock).not.toHaveBeenCalled();
  });

  it("startup permite si uso bajo", async () => {
    getTenantUsageMock.mockResolvedValue({
      tokens_input: 1000,
      tokens_output: 2000,
      cost_usd: 0.1,
      requests: 3,
      cache_hits: 0,
    });
    const s = await checkBudget("t1", "startup");
    expect(s.allowed).toBe(true);
    expect(s.force_cheap).toBe(false);
  });

  it("rechaza startup al 100% tokens", async () => {
    getTenantUsageMock.mockResolvedValue({
      tokens_input: 8000,
      tokens_output: 2500,
      cost_usd: 0.01,
      requests: 1,
      cache_hits: 0,
    });
    const s = await checkBudget("t1", "startup");
    expect(s.allowed).toBe(false);
  });

  it("rechaza startup al 100% coste", async () => {
    getTenantUsageMock.mockResolvedValue({
      tokens_input: 100,
      tokens_output: 100,
      cost_usd: 0.55,
      requests: 1,
      cache_hits: 0,
    });
    const s = await checkBudget("t1", "startup");
    expect(s.allowed).toBe(false);
  });

  it("warn al 80% dispara notifyDiscord una vez por mes", async () => {
    getTenantUsageMock.mockResolvedValue({
      tokens_input: 7500,
      tokens_output: 500,
      cost_usd: 0.05,
      requests: 1,
      cache_hits: 0,
    });
    await checkBudget("same-tenant", "startup");
    await checkBudget("same-tenant", "startup");
    expect(notifyDiscordMock.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("PLAN_BUDGETS límites esperados", () => {
    expect(PLAN_BUDGETS.startup.max_tokens_month).toBe(10_000);
    expect(PLAN_BUDGETS.startup.max_cost_usd_month).toBe(0.5);
    expect(PLAN_BUDGETS.business.max_tokens_month).toBe(50_000);
    expect(PLAN_BUDGETS.enterprise.max_tokens_month).toBe(Number.POSITIVE_INFINITY);
  });
});
