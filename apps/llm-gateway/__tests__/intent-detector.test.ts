import { beforeEach, describe, expect, it, vi } from "vitest";

const llmCallDirectMock = vi.hoisted(() => vi.fn());

vi.mock("../src/llm-direct.js", () => ({
  llmCallDirect: (...args: unknown[]) => llmCallDirectMock(...args),
}));

import { detectIntent, fallbackIntent } from "../src/intent-detector.js";

describe("intent-detector", () => {
  beforeEach(() => {
    llmCallDirectMock.mockReset();
  });

  it("detecta bug_fix vía Haiku", async () => {
    llmCallDirectMock.mockResolvedValueOnce({
      content: JSON.stringify({
        intent: "bug_fix",
        confidence: 0.95,
        affected_area: "frontend",
        urgency: "high",
        suggested_team: "frontend-team",
      }),
    });
    const r = await detectIntent("t1", "el login devuelve 500");
    expect(r.intent).toBe("bug_fix");
    expect(r.affected_area).toBe("frontend");
    expect(r.suggested_team).toBe("frontend-team");
  });

  it("detecta feature_request", async () => {
    llmCallDirectMock.mockResolvedValueOnce({
      content: `{"intent":"feature_request","confidence":0.9,"affected_area":"backend","urgency":"medium","suggested_team":"backend-team"}`,
    });
    const r = await detectIntent("t1", "añadir endpoint de export CSV");
    expect(r.intent).toBe("feature_request");
  });

  it("detecta refactor", async () => {
    llmCallDirectMock.mockResolvedValueOnce({
      content: JSON.stringify({
        intent: "refactor",
        confidence: 0.88,
        affected_area: "backend",
        urgency: "low",
        suggested_team: "backend-team",
      }),
    });
    const r = await detectIntent("t1", "refactor del módulo de auth");
    expect(r.intent).toBe("refactor");
  });

  it("detecta deploy", async () => {
    llmCallDirectMock.mockResolvedValueOnce({
      content: JSON.stringify({
        intent: "deploy",
        confidence: 0.92,
        affected_area: "infra",
        urgency: "medium",
        suggested_team: "infra-team",
      }),
    });
    const r = await detectIntent("t1", "desplegar cambios en la pipeline CI");
    expect(r.intent).toBe("deploy");
    expect(r.affected_area).toBe("infra");
  });

  it("detecta analysis", async () => {
    llmCallDirectMock.mockResolvedValueOnce({
      content: JSON.stringify({
        intent: "analysis",
        confidence: 0.8,
        affected_area: "ml",
        urgency: "low",
        suggested_team: "ml-team",
      }),
    });
    const r = await detectIntent("t1", "analiza métricas de embeddings");
    expect(r.intent).toBe("analysis");
    expect(r.affected_area).toBe("ml");
  });

  it("usa fallback heurístico si Haiku falla", async () => {
    llmCallDirectMock.mockRejectedValueOnce(new Error("network"));
    const r = await detectIntent("t1", "hay un bug crítico en producción");
    expect(r.intent).toBe("bug_fix");
    expect(r.confidence).toBeLessThan(0.9);
  });

  it("fallbackIntent clasifica config", () => {
    const r = fallbackIntent("cambia la variable en Doppler prd");
    expect(r.intent).toBe("config");
  });
});
