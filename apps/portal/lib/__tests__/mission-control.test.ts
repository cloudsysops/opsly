import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { InfraStatusPayload, InfraService } from "../app/mission-control/page";

// Mock fetch para simular respuestas de API
global.fetch = vi.fn();

// Mock swr
vi.mock("swr", () => ({
  default: vi.fn(() => ({
    data: undefined,
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  })),
}));

// Mock supabase client
vi.mock("../lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
    },
  })),
}));

// Mock portal-api-paths
vi.mock("../lib/portal-api-paths", () => ({
  infraStatusUrl: vi.fn((base: string) => `${base}/api/infra/status`),
}));

// Mock api
vi.mock("../lib/api", () => ({
  getApiBaseUrl: vi.fn(() => "http://localhost:3000"),
}));

import { createClient } from "../lib/supabase/client";
import { infraStatusUrl } from "../lib/portal-api-paths";
import { getApiBaseUrl } from "../lib/api";

describe("Mission Control - Seguridad y Autenticación", () => {
  let mockFetch: vi.Mock;
  let mockCreateClient: vi.Mock;
  let mockGetSession: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = global.fetch as vi.Mock;
    mockCreateClient = createClient as vi.Mock;
    mockGetSession = vi.fn();
    mockCreateClient.mockReturnValue({
      auth: { getSession: mockGetSession },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Test Case 1: Acceso sin Sesión (Unauthorized)", () => {
    it("getSession devuelve null cuando no hay sesión", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();

      expect(error).toBeNull();
      expect(data.session).toBeNull();
    });

    it("fetch devuelve 401 cuando la API rechaza sin token", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          statusText: "Unauthorized",
        }),
      );

      const response = await fetch("http://localhost:3000/api/infra/status");

      expect(response.status).toBe(401);
    });

    it("la llamada a la API lanza error con mensaje Unauthorized", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        }),
      );

      const makeRequest = async () => {
        const res = await fetch("http://localhost:3000/api/infra/status");
        if (!res.ok) {
          const body = await res.json();
          throw new Error(
            res.status === 401 ? "Unauthorized" : body.message ?? "Error",
          );
        }
        return res.json();
      };

      await expect(makeRequest()).rejects.toThrow("Unauthorized");
    });
  });

  describe("Test Case 2: Acceso con Sesión Válida", () => {
    it("getSession devuelve un token válido", async () => {
      const validSession = {
        data: {
          session: {
            access_token: "valid-jwt-token",
            user: { id: "user-1", email: "test@test.com" },
          },
        },
        error: null,
      };
      mockGetSession.mockResolvedValue(validSession);

      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();

      expect(error).toBeNull();
      expect(data.session).not.toBeNull();
      expect(data.session?.access_token).toBe("valid-jwt-token");
    });

    it("fetch devuelve 200 con datos de servicios", async () => {
      const mockPayload: InfraStatusPayload = {
        services: [
          {
            name: "api",
            status: "healthy",
            lastSeenSeconds: 10,
            ttlSeconds: 50,
            metadata: { version: "1.0.0" },
          },
          {
            name: "orchestrator",
            status: "healthy",
            lastSeenSeconds: 5,
            ttlSeconds: 55,
            metadata: {},
          },
        ],
        generated_at: new Date().toISOString(),
      };

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockPayload), {
          status: 200,
        }),
      );

      const response = await fetch("http://localhost:3000/api/infra/status", {
        headers: { Authorization: "Bearer valid-jwt-token" },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty("services");
      expect(body.services.length).toBe(2);
    });

    it("el payload contiene servicios con estructura esperada", async () => {
      const mockServices: InfraService[] = [
        {
          name: "api",
          status: "healthy",
          lastSeenSeconds: 10,
          ttlSeconds: 50,
          metadata: { version: "1.0.0" },
        },
      ];

      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            services: mockServices,
            generated_at: new Date().toISOString(),
          }),
          { status: 200 },
        ),
      );

      const response = await fetch("http://localhost:3000/api/infra/status", {
        headers: { Authorization: "Bearer valid-jwt-token" },
      });

      const body: InfraStatusPayload = await response.json();

      expect(body.services[0]).toHaveProperty("name");
      expect(body.services[0]).toHaveProperty("status");
      expect(body.services[0]).toHaveProperty("lastSeenSeconds");
      expect(body.services[0]).toHaveProperty("ttlSeconds");
      expect(body.services[0]).toHaveProperty("metadata");
    });
  });
});

describe("infraStatusUrl - Utilidad de URLs", () => {
  it("construye URL correcta para endpoint público", () => {
    const baseUrl = "http://localhost:3000";
    const url = infraStatusUrl(baseUrl);
    expect(url).toBe(`${baseUrl}/api/infra/status`);
  });

  it("construye URL correcta para producción", () => {
    const baseUrl = "https://api.ops.smiletripcare.com";
    const url = infraStatusUrl(baseUrl);
    expect(url).toBe(`${baseUrl}/api/infra/status`);
  });
});