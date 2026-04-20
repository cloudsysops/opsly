import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notifyDiscord: vi.fn().mockResolvedValue(undefined),
  llmCallDirect: vi.fn(),
}));

vi.mock("../src/discord-notify.js", () => ({
  notifyDiscord: (...args: unknown[]) => mocks.notifyDiscord(...args),
}));

vi.mock("../src/llm-direct.js", () => ({
  llmCallDirect: (...args: unknown[]) => mocks.llmCallDirect(...args),
}));

import { batchedLLMCall } from "../src/batcher.js";
import { analyzeComplexity } from "../src/complexity.js";
import { HealthDaemon } from "../src/health-daemon.js";
import { PROVIDERS } from "../src/providers.js";
import { estimateCost } from "../src/router.js";

describe("LLM Gateway Beast Mode", () => {
  describe("analyzeComplexity", () => {
    it("clasifica como nivel 1 tareas simples", () => {
      expect(analyzeComplexity("clasifica este texto").level).toBe(1);
      expect(analyzeComplexity("extrae los nombres").level).toBe(1);
      expect(analyzeComplexity("responde sí o no").level).toBe(1);
    });

    it("clasifica como nivel 3 tareas complejas", () => {
      expect(
        analyzeComplexity(
          "diseña la arquitectura y refactoriza este código con estrategia de roadmap",
        ).level,
      ).toBe(3);
    });

    it("should_decompose es true para prompts largos nivel 3", () => {
      const longPrompt = "diseña ".repeat(400) + " arquitectura";
      const result = analyzeComplexity(longPrompt);
      expect(result.should_decompose).toBe(true);
    });
  });

  describe("HealthDaemon", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      mocks.notifyDiscord.mockClear();
    });

    it("marca provider como down tras 3 fallos", async () => {
      const setEx = vi.fn().mockResolvedValue(undefined);
      const get = vi
        .fn()
        .mockResolvedValueOnce("degraded")
        .mockResolvedValueOnce(JSON.stringify({ consecutive_failures: 2, status: "degraded" }));

      const connect = vi.fn().mockResolvedValue(undefined);
      const disconnect = vi.fn().mockResolvedValue(undefined);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("network")) as typeof fetch,
      );

      const daemon = new HealthDaemon();
      (
        daemon as unknown as {
          redis: {
            connect: typeof connect;
            disconnect: typeof disconnect;
            get: typeof get;
            setEx: typeof setEx;
          };
        }
      ).redis = {
        connect,
        disconnect,
        get,
        setEx,
      };
      (daemon as unknown as { connected: boolean }).connected = true;

      const check = vi.fn().mockRejectedValue(new Error("fail"));
      await (
        daemon as unknown as {
          checkProvider: (n: string, c: () => Promise<number>) => Promise<void>;
        }
      ).checkProvider("anthropic", check);

      const healthCall = setEx.mock.calls.find((c: unknown[]) => String(c[0]).endsWith(":health"));
      expect(healthCall).toBeDefined();
      const payload = JSON.parse(String(healthCall?.[2])) as { status: string; consecutive_failures: number };
      expect(payload.status).toBe("down");
      expect(payload.consecutive_failures).toBe(3);
    });

    it("isAvailable retorna false para provider down", async () => {
      const get = vi.fn().mockResolvedValue("down");
      const connect = vi.fn().mockResolvedValue(undefined);
      const daemon = new HealthDaemon();
      (
        daemon as unknown as {
          redis: {
            connect: typeof connect;
            get: typeof get;
            setEx: (a: string, b: number, c: string) => Promise<void>;
          };
        }
      ).redis = {
        connect,
        get,
        setEx: vi.fn(),
      };
      (daemon as unknown as { connected: boolean }).connected = true;

      const available = await daemon.isAvailable("anthropic");
      expect(available).toBe(false);
    });

    it("notifica Discord cuando provider cae", async () => {
      process.env.DISCORD_WEBHOOK_URL = "https://example.com/webhook";

      const setEx = vi.fn().mockResolvedValue(undefined);
      const get = vi
        .fn()
        .mockResolvedValueOnce("degraded")
        .mockResolvedValueOnce(JSON.stringify({ consecutive_failures: 2, status: "degraded" }));

      const connect = vi.fn().mockResolvedValue(undefined);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("boom")) as typeof fetch,
      );

      const daemon = new HealthDaemon();
      (
        daemon as unknown as {
          redis: { connect: typeof connect; get: typeof get; setEx: typeof setEx };
        }
      ).redis = {
        connect,
        get,
        setEx,
      };
      (daemon as unknown as { connected: boolean }).connected = true;

      const check = vi.fn().mockRejectedValue(new Error("x"));
      await (
        daemon as unknown as {
          checkProvider: (n: string, c: () => Promise<number>) => Promise<void>;
        }
      ).checkProvider("openai", check);

      expect(mocks.notifyDiscord).toHaveBeenCalled();
      delete process.env.DISCORD_WEBHOOK_URL;
    });
  });

  describe("Batcher", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      mocks.llmCallDirect.mockReset();
      mocks.llmCallDirect.mockResolvedValue({
        content: "ok",
        model_used: "x",
        tokens_input: 1,
        tokens_output: 1,
        cost_usd: 0,
        cache_hit: false,
        latency_ms: 1,
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("flush con ventana 0 ejecuta llamada directa", async () => {
      const p = batchedLLMCall(
        { tenant_slug: "t", messages: [{ role: "user", content: "hola" }] },
        1,
      );
      await vi.runAllTimersAsync();
      const r = await p;
      expect(r.content).toBe("ok");
      expect(mocks.llmCallDirect).toHaveBeenCalledTimes(1);
    });

    it("acumula y paraleliza varias peticiones nivel 1", async () => {
      const p1 = batchedLLMCall(
        { tenant_slug: "t", messages: [{ role: "user", content: "a" }] },
        1,
      );
      const p2 = batchedLLMCall(
        { tenant_slug: "t", messages: [{ role: "user", content: "b" }] },
        1,
      );
      await vi.runAllTimersAsync();
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.content).toBe("ok");
      expect(r2.content).toBe("ok");
      expect(mocks.llmCallDirect).toHaveBeenCalledTimes(2);
    });

    it("nivel 3 combina dos tareas en una llamada y reparte JSON por subtarea", async () => {
      mocks.llmCallDirect.mockResolvedValueOnce({
        content: JSON.stringify({ task_1: "resp-A", task_2: "resp-B" }),
        model_used: "claude-sonnet-4-20250514",
        tokens_input: 100,
        tokens_output: 40,
        cost_usd: 0.02,
        cache_hit: false,
        latency_ms: 50,
      });
      const p1 = batchedLLMCall(
        { tenant_slug: "t", messages: [{ role: "user", content: "tarea uno" }] },
        3,
      );
      const p2 = batchedLLMCall(
        { tenant_slug: "t", messages: [{ role: "user", content: "tarea dos" }] },
        3,
      );
      await vi.runAllTimersAsync();
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.content).toBe("resp-A");
      expect(r2.content).toBe("resp-B");
      expect(mocks.llmCallDirect).toHaveBeenCalledTimes(1);
      const combinedCall = mocks.llmCallDirect.mock.calls[0]?.[0] as { model?: string };
      expect(combinedCall.model).toBe("sonnet");
    });
  });

  describe("Cost estimation", () => {
    it("Llama local cuesta $0", () => {
      expect(estimateCost(PROVIDERS.llama_local, 1000, 500)).toBe(0);
    });

    it("Haiku es 12x más barato que Sonnet", () => {
      const haikuCost = estimateCost(PROVIDERS.claude_haiku, 1000, 500);
      const sonnetCost = estimateCost(PROVIDERS.claude_sonnet, 1000, 500);
      expect(sonnetCost / haikuCost).toBeGreaterThan(10);
    });
  });
});
