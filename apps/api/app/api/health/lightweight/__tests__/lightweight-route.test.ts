import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "../route";

describe("GET /api/health/lightweight", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns ok without external calls", async () => {
    delete process.env.OPSLY_STANDBY_ROLE;
    delete process.env.WORKER_ID;

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("ok");
    expect(body.mode).toBe("primary");
    expect(body).toHaveProperty("timestamp");
  });

  it("marks failover when OPSLY_STANDBY_ROLE=gcp", async () => {
    process.env.OPSLY_STANDBY_ROLE = "gcp";

    const res = await GET();
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.mode).toBe("failover");
  });

  it("marks failover when WORKER_ID contains gcp", async () => {
    delete process.env.OPSLY_STANDBY_ROLE;
    process.env.WORKER_ID = "node-gcp-1";

    const res = await GET();
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.mode).toBe("failover");
  });
});
