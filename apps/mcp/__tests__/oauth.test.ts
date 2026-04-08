import { beforeEach, describe, expect, it, vi } from "vitest";

describe("PKCE", () => {
  it("generateCodeVerifier produce string base64url no vacía", async () => {
    const { generateCodeVerifier, generateCodeChallenge, verifyCodeChallenge } = await import(
      "../src/auth/pkce.js"
    );
    const v = generateCodeVerifier();
    expect(v.length).toBeGreaterThan(20);
    expect(v).toMatch(/^[\w-]+$/);
    const challenge = generateCodeChallenge(v);
    expect(verifyCodeChallenge(v, challenge, "S256")).toBe(true);
  });

  it("verifyCodeChallenge rechaza verifier incorrecto", async () => {
    const { generateCodeVerifier, generateCodeChallenge, verifyCodeChallenge } = await import(
      "../src/auth/pkce.js"
    );
    const v = generateCodeVerifier();
    const challenge = generateCodeChallenge(v);
    expect(verifyCodeChallenge("otro-verifier", challenge, "S256")).toBe(false);
  });
});

describe("JWT access tokens (MCP)", () => {
  beforeEach(() => {
    process.env.MCP_JWT_SECRET = "unit-test-mcp-jwt-secret-32chars!";
  });

  it("generateAccessToken produce JWT verificable", async () => {
    const { generateAccessToken, verifyAccessToken } = await import("../src/auth/tokens.js");
    const t = generateAccessToken("claude-ai", ["tenants:read"], undefined, 120);
    const parts = t.split(".");
    expect(parts).toHaveLength(3);
    const p = verifyAccessToken(t);
    expect(p).not.toBeNull();
    expect(p?.sub).toBe("claude-ai");
    expect(p?.scope).toContain("tenants:read");
  });

  it("verifyAccessToken rechaza token expirado", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    const { generateAccessToken, verifyAccessToken } = await import("../src/auth/tokens.js");
    const t = generateAccessToken("c", ["tenants:read"], undefined, 60);
    vi.setSystemTime(new Date("2024-01-01T01:00:00Z"));
    expect(verifyAccessToken(t)).toBeNull();
    vi.useRealTimers();
  });

  it("verifyAccessToken rechaza firma inválida", async () => {
    const { generateAccessToken, verifyAccessToken } = await import("../src/auth/tokens.js");
    const t = generateAccessToken("c", ["tenants:read"]);
    const broken = t.slice(0, -4) + "xxxx";
    expect(verifyAccessToken(broken)).toBeNull();
  });
});

describe("requireMCPAuth", () => {
  beforeEach(() => {
    process.env.MCP_JWT_SECRET = "unit-test-mcp-jwt-secret-32chars!";
    process.env.PLATFORM_ADMIN_TOKEN = "unit-test-platform-admin-32chars!!";
  });

  it("acepta PLATFORM_ADMIN_TOKEN como Bearer", async () => {
    const { requireMCPAuth } = await import("../src/auth/middleware.js");
    const r = requireMCPAuth(`Bearer ${process.env.PLATFORM_ADMIN_TOKEN}`, "tenants:write");
    expect(r.authorized).toBe(true);
    if (r.authorized) {
      expect(r.payload.scope).toContain("*");
    }
  });

  it("rechaza token inválido", async () => {
    const { requireMCPAuth } = await import("../src/auth/middleware.js");
    const r = requireMCPAuth("Bearer not-a-real-jwt", "tenants:read");
    expect(r.authorized).toBe(false);
  });

  it("verifica scope requerido", async () => {
    const { generateAccessToken } = await import("../src/auth/tokens.js");
    const { requireMCPAuth } = await import("../src/auth/middleware.js");
    const narrow = generateAccessToken("claude-ai", ["tenants:read"], undefined, 600);
    const denied = requireMCPAuth(`Bearer ${narrow}`, "executor:write");
    expect(denied.authorized).toBe(false);
    const ok = requireMCPAuth(`Bearer ${narrow}`, "tenants:read");
    expect(ok.authorized).toBe(true);
  });
});
