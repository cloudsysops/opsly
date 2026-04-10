import { describe, expect, it } from "vitest";

import { parseUsageRedisKey } from "../flush-billing-usage";

describe("parseUsageRedisKey", () => {
  it("parsea tenant UUID y métrica", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const p = parseUsageRedisKey(`usage:${id}:ai_tokens`);
    expect(p).toEqual({ tenantId: id, metricType: "ai_tokens" });
  });

  it("rechaza claves sin patrón usage:{uuid}:{metric}", () => {
    expect(parseUsageRedisKey("usage:bad:ai_tokens")).toBeNull();
    expect(parseUsageRedisKey("other:a1b2c3d4-e5f6-7890-abcd-ef1234567890:ai_tokens")).toBeNull();
  });
});
