import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn(() => ({
      messages: {
        create: createMock,
      },
    })),
  };
});

vi.mock("../src/health-daemon.js", () => ({
  healthDaemon: {
    isAvailable: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../src/cache.js", () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}));

vi.mock("../src/logger.js", () => ({
  logUsage: vi.fn(),
}));

vi.mock("../src/structured-log.js", () => ({
  logGatewayEvent: vi.fn(),
}));

import * as cache from "../src/cache.js";
import { llmCall } from "../src/gateway.js";

describe("LLM Gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna cache hit sin llamar a Anthropic", async () => {
    vi.mocked(cache.cacheGet).mockResolvedValueOnce("respuesta cacheada");

    const resultPromise = llmCall({
      tenant_slug: "test",
      legacy_pipeline: true,
      messages: [{ role: "user", content: "hola" }],
      temperature: 0,
    });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.cache_hit).toBe(true);
    expect(result.content).toBe("respuesta cacheada");
    expect(result.cost_usd).toBe(0);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("llama a Anthropic en cache miss", async () => {
    vi.mocked(cache.cacheGet).mockResolvedValueOnce(null);
    createMock.mockResolvedValueOnce({
      content: [{ type: "text", text: "respuesta modelo" }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const resultPromise = llmCall({
      tenant_slug: "test",
      legacy_pipeline: true,
      messages: [{ role: "user", content: "hola" }],
    });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.cache_hit).toBe(false);
    expect(result.content).toBe("respuesta modelo");
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
