import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { redis, resolveTenantUuid, getOrchestratorRedis } = vi.hoisted(() => ({
  redis: {
    incrby: vi.fn().mockResolvedValue(1),
    incrbyfloat: vi.fn().mockResolvedValue(1),
  },
  resolveTenantUuid: vi.fn(),
  getOrchestratorRedis: vi.fn(),
}));

vi.mock("../src/metering/tenant-id.js", () => ({
  resolveTenantUuid,
}));

vi.mock("../src/metering/redis-client.js", () => ({
  getOrchestratorRedis,
}));

import {
  drainMeteringOperations,
  meterPlannerLlmFireAndForget,
  meterRemotePlanWorkerFireAndForget,
} from "../src/metering/usage-events-meter.js";

describe("usage-events-meter", () => {
  beforeEach(() => {
    resolveTenantUuid.mockResolvedValue("tenant-uuid");
    getOrchestratorRedis.mockReturnValue(redis);
  });

  afterEach(async () => {
    await drainMeteringOperations();
    vi.clearAllMocks();
  });

  it("drains pending planner metering before shutdown", async () => {
    meterPlannerLlmFireAndForget("acme", undefined, {
      model_used: "haiku",
      tokens_input: 10,
      tokens_output: 5,
    });

    expect(redis.incrby).not.toHaveBeenCalled();

    await drainMeteringOperations();

    expect(resolveTenantUuid).toHaveBeenCalledWith("acme", undefined);
    expect(redis.incrby).toHaveBeenCalledWith("usage:tenant-uuid:ai_tokens", 15);
  });

  it("drains pending cpu metering before shutdown", async () => {
    meterRemotePlanWorkerFireAndForget("acme", "tenant-hint", 3.5);

    await drainMeteringOperations();

    expect(resolveTenantUuid).toHaveBeenCalledWith("acme", "tenant-hint");
    expect(redis.incrbyfloat).toHaveBeenCalledWith("usage:tenant-uuid:cpu_seconds", 3.5);
  });
});
