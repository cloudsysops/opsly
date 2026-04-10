import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../app/api/infra/status/route";
import { HTTP_STATUS } from "../lib/constants";

vi.mock("../lib/portal-tenant-dal", () => ({
  runTrustedPortalDal: vi.fn(),
}));

vi.mock("../lib/infra/heartbeat", () => ({
  heartbeatKey: vi.fn((name: string) => `heartbeat:${name}`),
  classifyHeartbeat: vi.fn(),
  requireHeartbeatRedis: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  getServiceClient: vi.fn(),
}));

import { runTrustedPortalDal } from "../lib/portal-tenant-dal";
import {
  heartbeatKey,
  classifyHeartbeat,
  requireHeartbeatRedis,
} from "../lib/infra/heartbeat";

describe("GET /api/infra/status", () => {
  let mockRunTrustedPortalDal: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockRunTrustedPortalDal = runTrustedPortalDal as vi.Mock;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Test Case 1: Acceso Denegado sin Token", () => {
    it("debe devolver 401 sin cabecera Authorization", async () => {
      mockRunTrustedPortalDal.mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: HTTP_STATUS.UNAUTHORIZED,
        }),
      );

      const request = new NextRequest("http://localhost:3000/api/infra/status");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(body).not.toHaveProperty("services");
      expect(body).toHaveProperty("error");
    });

    it("no debe incluir datos de servicios en respuesta sin token", async () => {
      mockRunTrustedPortalDal.mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: HTTP_STATUS.UNAUTHORIZED,
        }),
      );

      const request = new NextRequest("http://localhost:3000/api/infra/status");
      const response = await GET(request);
      const body = await response.json();

      expect(body.services).toBeUndefined();
    });
  });

  describe("Test Case 2: Acceso Exitoso con Token Válido", () => {
    it("debe devolver 200 con token válido y datos de servicios", async () => {
      const mockServices = [
        {
          name: "api",
          status: "healthy",
          lastSeenSeconds: 10,
          ttlSeconds: 50,
          metadata: { foo: "bar" },
        },
        {
          name: "orchestrator",
          status: "healthy",
          lastSeenSeconds: 15,
          ttlSeconds: 45,
          metadata: {},
        },
      ];

      const mockRedis = {
        scanIterator: async function* () {
          yield "heartbeat:api";
          yield "heartbeat:orchestrator";
        },
        get: vi.fn().mockResolvedValue(JSON.stringify({ ts: Date.now(), metadata: {} })),
        ttl: vi.fn().mockResolvedValue(50),
      };

      (requireHeartbeatRedis as vi.Mock).mockResolvedValue(mockRedis);
      (heartbeatKey as vi.Mock).mockImplementation((name: string) => `heartbeat:${name}`);
      (classifyHeartbeat as vi.Mock).mockImplementation(
        (name: string, raw: string | null, ttl: number, now: number) => ({
          name,
          status: "healthy",
          lastSeenSeconds: 10,
          ttlSeconds: ttl,
          metadata: {},
        }),
      );

      mockRunTrustedPortalDal.mockImplementation(async (request: Request, fn: () => unknown) => {
        return fn();
      });

      const request = new NextRequest("http://localhost:3000/api/infra/status", {
        headers: {
          Authorization: "Bearer valid-jwt-token",
        },
      });
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("services");
      expect(Array.isArray(body.services)).toBe(true);
    });

    it("debe devolver servicios con estructura esperada", async () => {
      const mockRedis = {
        scanIterator: async function* () {
          yield "heartbeat:api";
        },
        get: vi.fn().mockResolvedValue(JSON.stringify({ ts: Date.now(), metadata: {} })),
        ttl: vi.fn().mockResolvedValue(60),
      };

      (requireHeartbeatRedis as vi.Mock).mockResolvedValue(mockRedis);
      (heartbeatKey as vi.Mock).mockImplementation((name: string) => `heartbeat:${name}`);
      (classifyHeartbeat as vi.Mock).mockImplementation(
        (name: string, raw: string | null, ttl: number, now: number) => ({
          name,
          status: "healthy",
          lastSeenSeconds: 5,
          ttlSeconds: ttl,
          metadata: { version: "1.0.0" },
        }),
      );

      mockRunTrustedPortalDal.mockImplementation(async (request: Request, fn: () => unknown) => {
        return fn();
      });

      const request = new NextRequest("http://localhost:3000/api/infra/status", {
        headers: {
          Authorization: "Bearer valid-jwt-token",
        },
      });
      const response = await GET(request);
      const body = await response.json();

      expect(body.services).toBeDefined();
      expect(body.services.length).toBeGreaterThan(0);
      expect(body.services[0]).toHaveProperty("name");
      expect(body.services[0]).toHaveProperty("status");
      expect(body.services[0]).toHaveProperty("lastSeenSeconds");
      expect(body.services[0]).toHaveProperty("ttlSeconds");
      expect(body.services[0]).toHaveProperty("metadata");
    });
  });
});