import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "../route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/provisioning/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/provisioning/quote", () => {
  beforeEach(() => {
    delete process.env.OPSLY_MANAGEMENT_FEE_USD;
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/provisioning/quote", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 422 on invalid body", async () => {
    const res = await POST(makeRequest({ provider: "aws", plan: "enterprise" }));
    expect(res.status).toBe(422);
  });

  it("returns 501 for azure", async () => {
    const res = await POST(makeRequest({ provider: "azure", plan: "free-tier" }));
    expect(res.status).toBe(501);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("provider_not_implemented");
  });

  it("returns quote for aws free-tier with opsly fee 29", async () => {
    const res = await POST(makeRequest({ provider: "aws", plan: "free-tier" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      cloud_cost_estimated_usd: number;
      opsly_fee_usd: number;
      total_monthly_usd: number;
      terms: string;
      is_free_tier: boolean;
    };
    expect(json.cloud_cost_estimated_usd).toBe(0);
    expect(json.opsly_fee_usd).toBe(29);
    expect(json.total_monthly_usd).toBe(29);
    expect(json.is_free_tier).toBe(true);
    expect(json.terms).toContain("cuenta de AWS");
  });

  it("respects OPSLY_MANAGEMENT_FEE_USD when set", async () => {
    process.env.OPSLY_MANAGEMENT_FEE_USD = "35";
    const res = await POST(makeRequest({ provider: "aws", plan: "free-tier" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { opsly_fee_usd: number; total_monthly_usd: number };
    expect(json.opsly_fee_usd).toBe(35);
    expect(json.total_monthly_usd).toBe(35);
  });
});
