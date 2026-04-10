import { describe, expect, it, vi } from "vitest";

import { drainMeteringFallbackForTests } from "../metering-fallback-queue";
import { withMetering } from "../metering-middleware";
import * as meteringRecord from "../metering-record";

describe("withMetering", () => {
  it("no agenda medición si la respuesta no es OK", async () => {
    const spy = vi.spyOn(meteringRecord, "scheduleMeteringProcessing");
    const wrapped = withMetering(
      async () => new Response("nope", { status: 500 }),
      {
        resolveTenantId: () => "t1",
        operation: "deploy",
        kind: "resource",
        resolveMetricType: () => "cpu_seconds",
      },
    );
    const res = await wrapped(new Request("https://x/api/deploy"), {} as never);
    expect(res.status).toBe(500);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("agenda medición en microtask si 200", async () => {
    const spy = vi.spyOn(meteringRecord, "scheduleMeteringProcessing");
    const wrapped = withMetering(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
      {
        resolveTenantId: () => "tenant-a",
        operation: "analyze",
        kind: "token",
        resolveMetricType: () => "ai_tokens",
        resolveQuantity: () => 42,
      },
    );
    const res = await wrapped(
      new Request("https://x/api/analyze"),
      {} as never,
    );
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 0));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({
      tenantId: "tenant-a",
      metricType: "ai_tokens",
      quantity: 42,
      operation: "analyze",
      kind: "token",
    });
    spy.mockRestore();
  });

  it("no agenda sin tenantId", async () => {
    const spy = vi.spyOn(meteringRecord, "scheduleMeteringProcessing");
    const wrapped = withMetering(
      async () => new Response("ok", { status: 200 }),
      {
        resolveTenantId: () => null,
        operation: "deploy",
        kind: "resource",
        resolveMetricType: () => "cpu_seconds",
      },
    );
    await wrapped(new Request("https://x/api/deploy"), {} as never);
    await new Promise((r) => setTimeout(r, 0));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("metering fallback queue", () => {
  it("drain vacía la cola de tests", () => {
    drainMeteringFallbackForTests();
    expect(drainMeteringFallbackForTests().length).toBe(0);
  });
});
