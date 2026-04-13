import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/api-client.js", () => ({
  opslyFetch: vi.fn()
}));

vi.mock("../src/lib/github.js", () => ({
  writeActivePrompt: vi.fn(async () => undefined),
}));

vi.mock("../src/lib/events.js", () => ({
  publishEvent: vi.fn(async () => undefined),
}));

import { opslyFetch } from "../src/lib/api-client.js";
import { writeActivePrompt } from "../src/lib/github.js";
import { metricsTool } from "../src/tools/metrics.js";
import { onboardTool } from "../src/tools/onboard.js";
import { opsStubsTools } from "../src/tools/ops-stubs.js";
import { tenantsTools } from "../src/tools/tenants.js";

describe("MCP Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("get_tenants llama a /api/tenants", async () => {
    const mock = [{ slug: "test", status: "active" }];
    vi.mocked(opslyFetch).mockResolvedValueOnce(mock);

    const result = await tenantsTools[0].handler({});
    expect(result.tenants).toEqual(mock);
    expect(opslyFetch).toHaveBeenCalledWith("/api/tenants");
  });

  it("get_tenant llama a /api/tenants/:ref", async () => {
    const mock = { slug: "intcloudsysops", status: "active" };
    vi.mocked(opslyFetch).mockResolvedValueOnce(mock);

    const result = await tenantsTools[1].handler({ ref: "intcloudsysops" });
    expect(result.tenant).toEqual(mock);
    expect(opslyFetch).toHaveBeenCalledWith("/api/tenants/intcloudsysops");
  });

  it("onboard_tenant crea tenant y envia invitacion", async () => {
    vi.mocked(opslyFetch)
      .mockResolvedValueOnce({ id: "uuid-123" })
      .mockResolvedValueOnce({ link: "https://portal/invite/abc" });

    const result = await onboardTool.handler({
      slug: "nuevo-cliente",
      email: "cliente@test.com",
      plan: "startup",
      send_invitation: true
    });

    expect(result.success).toBe(true);
    expect(result.invitation_sent).toBe(true);
    expect(opslyFetch).toHaveBeenCalledTimes(2);
  });

  it("onboard_tenant sin invitacion", async () => {
    vi.mocked(opslyFetch).mockResolvedValueOnce({ id: "uuid-456" });

    const result = await onboardTool.handler({
      slug: "solo-tenant",
      email: "test@test.com",
      plan: "business",
      send_invitation: false
    });

    expect(result.success).toBe(true);
    expect(result.invitation_sent).toBe(false);
    expect(opslyFetch).toHaveBeenCalledTimes(1);
  });

  it("get_health retorna status", async () => {
    vi.mocked(opslyFetch).mockResolvedValueOnce({ status: "ok" });
    const result = await metricsTool[0].handler({});
    expect(result).toEqual({ status: "ok" });
  });

  it("get_metrics retorna metrica", async () => {
    vi.mocked(opslyFetch).mockResolvedValueOnce({ cpu_percent: 40 });
    const result = await metricsTool[1].handler({});
    expect(result).toEqual({ cpu_percent: 40 });
  });

  it("check_service_health usa health de plataforma por defecto", async () => {
    vi.mocked(opslyFetch).mockResolvedValueOnce({ status: "ok" });

    const result = await opsStubsTools[0].handler({});

    expect(result).toEqual({
      ok: true,
      scope: "platform",
      service: "platform",
      data: { status: "ok" },
    });
    expect(opslyFetch).toHaveBeenCalledWith("/api/health");
  });

  it("check_service_health usa health publico del tenant por slug", async () => {
    vi.mocked(opslyFetch).mockResolvedValueOnce({ slug: "acme" });

    const result = await opsStubsTools[0].handler({ service: "acme" });

    expect(result).toEqual({
      ok: true,
      scope: "tenant",
      service: "acme",
      data: { slug: "acme" },
    });
    expect(opslyFetch).toHaveBeenCalledWith("/api/portal/health?slug=acme");
  });

  it("restart_container escribe ACTIVE-PROMPT validado", async () => {
    const result = await opsStubsTools[1].handler({ container: "infra-app-1" });

    expect(result).toEqual({
      ok: true,
      queued: true,
      container: "infra-app-1",
      message: "restart request written to docs/ACTIVE-PROMPT.md",
    });
    expect(writeActivePrompt).toHaveBeenCalledTimes(1);
    expect(vi.mocked(writeActivePrompt).mock.calls[0]?.[0]).toContain(
      "docker restart 'infra-app-1'",
    );
  });

  it("restart_container rechaza nombres inseguros", async () => {
    await expect(
      opsStubsTools[1].handler({ container: "infra-app-1; rm -rf /" }),
    ).rejects.toThrow("Invalid container");
  });
});
