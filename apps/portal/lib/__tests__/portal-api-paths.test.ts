import { describe, expect, it } from "vitest";
import {
  portalTenantMeUrl,
  portalTenantModeUrl,
  portalTenantUsageUrl,
} from "../portal-api-paths";

const BASE = "http://127.0.0.1:3000";

describe("portalTenantMeUrl", () => {
  it("sin slug apunta a /api/portal/me", () => {
    expect(portalTenantMeUrl(BASE)).toBe(`${BASE}/api/portal/me`);
    expect(portalTenantMeUrl(BASE, undefined)).toBe(`${BASE}/api/portal/me`);
  });

  it("slug vacío usa /me", () => {
    expect(portalTenantMeUrl(BASE, "")).toBe(`${BASE}/api/portal/me`);
  });

  it("con slug codifica el segmento", () => {
    expect(portalTenantMeUrl(BASE, "acme")).toBe(
      `${BASE}/api/portal/tenant/acme/me`,
    );
    expect(portalTenantMeUrl(BASE, "a/b")).toBe(
      `${BASE}/api/portal/tenant/${encodeURIComponent("a/b")}/me`,
    );
  });

  it("normaliza barra final en base", () => {
    expect(portalTenantMeUrl(`${BASE}/`, "x")).toBe(
      `${BASE}/api/portal/tenant/x/me`,
    );
  });
});

describe("portalTenantModeUrl", () => {
  it("sin slug → /api/portal/mode", () => {
    expect(portalTenantModeUrl(BASE)).toBe(`${BASE}/api/portal/mode`);
  });

  it("con slug → /tenant/…/mode", () => {
    expect(portalTenantModeUrl(BASE, "t")).toBe(
      `${BASE}/api/portal/tenant/t/mode`,
    );
  });
});

describe("portalTenantUsageUrl", () => {
  it("sin slug → /usage?period=", () => {
    expect(portalTenantUsageUrl(BASE, "today")).toBe(
      `${BASE}/api/portal/usage?period=today`,
    );
    expect(portalTenantUsageUrl(BASE, "month")).toBe(
      `${BASE}/api/portal/usage?period=month`,
    );
  });

  it("con slug → /tenant/…/usage?period=", () => {
    expect(portalTenantUsageUrl(BASE, "today", "acme")).toBe(
      `${BASE}/api/portal/tenant/acme/usage?period=today`,
    );
  });
});
