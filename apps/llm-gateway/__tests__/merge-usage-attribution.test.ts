import { describe, expect, it } from "vitest";
import { mergeUsageAttribution } from "../src/logger.js";
import type { LLMRequest } from "../src/types.js";

describe("mergeUsageAttribution", () => {
  it("adds user_id, feature, metadata when present", () => {
    const req: LLMRequest = {
      tenant_slug: "acme",
      messages: [{ role: "user", content: "hi" }],
      user_id: "u1",
      feature: "legal_analysis",
      usage_metadata: { k: 1 },
    };
    const base = {
      tenant_slug: "acme",
      model: "haiku",
      tokens_input: 1,
      tokens_output: 2,
      cost_usd: 0.001,
      cache_hit: false,
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const out = mergeUsageAttribution(req, base);
    expect(out.user_id).toBe("u1");
    expect(out.feature).toBe("legal_analysis");
    expect(out.metadata).toEqual({ k: 1 });
  });

  it("omits empty attribution", () => {
    const req: LLMRequest = {
      tenant_slug: "acme",
      messages: [{ role: "user", content: "hi" }],
    };
    const base = {
      tenant_slug: "acme",
      model: "haiku",
      tokens_input: 1,
      tokens_output: 2,
      cost_usd: 0.001,
      cache_hit: false,
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const out = mergeUsageAttribution(req, base);
    expect(out.user_id).toBeUndefined();
    expect(out.feature).toBeUndefined();
    expect(out.metadata).toBeUndefined();
  });
});
