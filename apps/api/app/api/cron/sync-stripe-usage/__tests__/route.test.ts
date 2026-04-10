import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("../../../../../lib/stripe/usage-sync", () => ({
  syncAllTenantsUsage: vi.fn(),
}));

import { syncAllTenantsUsage } from "../../../../../lib/stripe/usage-sync";
import { GET, POST } from "../route";

const mockSync = syncAllTenantsUsage as ReturnType<typeof vi.fn>;

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/cron/sync-stripe-usage", {
    headers,
  });
}

describe("GET /api/cron/sync-stripe-usage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  it("returns 401 when no secret env", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 when bearer token is wrong", async () => {
    const res = await GET(makeRequest({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when x-cron-secret header is wrong", async () => {
    const res = await GET(makeRequest({ "x-cron-secret": "bad" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 with sync result on valid bearer", async () => {
    const mockResult = {
      tenants_synced: 2,
      tenants_skipped: 1,
      total_tokens: 5000,
      errors: [],
    };
    mockSync.mockResolvedValueOnce(mockResult);

    const res = await GET(
      makeRequest({ authorization: "Bearer test-cron-secret" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockResult);
  });

  it("returns 200 with sync result on valid x-cron-secret header", async () => {
    mockSync.mockResolvedValueOnce({
      tenants_synced: 0,
      tenants_skipped: 0,
      total_tokens: 0,
      errors: [],
    });
    const res = await GET(
      makeRequest({ "x-cron-secret": "test-cron-secret" }),
    );
    expect(res.status).toBe(200);
  });

  it("POST delegates to GET", async () => {
    mockSync.mockResolvedValueOnce({
      tenants_synced: 1,
      tenants_skipped: 0,
      total_tokens: 100,
      errors: [],
    });
    const res = await POST(
      makeRequest({ authorization: "Bearer test-cron-secret" }),
    );
    expect(res.status).toBe(200);
  });
});
