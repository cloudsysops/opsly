import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { GET } from "../route";

const ADMIN = "teams-metrics-admin";

describe("GET /api/metrics/teams", () => {
  const prev = process.env.PLATFORM_ADMIN_TOKEN;

  beforeEach(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN;
    delete process.env.REDIS_URL;
  });

  afterAll(() => {
    process.env.PLATFORM_ADMIN_TOKEN = prev;
  });

  it("returns 401 without admin token", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/metrics/teams", { method: "GET" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns team config with valid admin token", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/metrics/teams", {
        method: "GET",
        headers: { authorization: `Bearer ${ADMIN}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      teams: unknown[];
      total_parallel_capacity: number;
      timestamp: string;
    };
    expect(Array.isArray(body.teams)).toBe(true);
    expect(body.teams).toHaveLength(4);
    expect(body.total_parallel_capacity).toBe(8);
    expect(typeof body.timestamp).toBe("string");
  });
});
