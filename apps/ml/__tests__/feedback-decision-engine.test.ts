import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeFeedback } from "../src/feedback-decision-engine.js";
import * as llmGateway from "@intcloudsysops/llm-gateway";

vi.mock("@intcloudsysops/llm-gateway", () => ({
  llmCall: vi.fn(),
}));

function mockSupabase() {
  return {
    schema: () => ({
      from: (table: string) => {
        if (table === "feedback_decisions") {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: "dec-1" }, error: null }),
              }),
            }),
          };
        }
        if (table === "feedback_conversations") {
          return {
            update: () => ({
              eq: async () => ({ error: null }),
            }),
          };
        }
        return {};
      },
    }),
  };
}

describe("feedback-decision-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clasifica "typo en botón" como auto_implement', async () => {
    vi.mocked(llmGateway.llmCall).mockResolvedValue({
      content: JSON.stringify({
        decision_type: "auto_implement",
        criticality: "low",
        reasoning: "Es un typo de UI",
        implementation_prompt: "Corrige el texto del botón",
        user_response: "Lo corregimos en breve.",
      }),
      model_used: "haiku",
      tokens_input: 1,
      tokens_output: 1,
      cost_usd: 0,
      cache_hit: false,
      latency_ms: 1,
    });

    const { output } = await analyzeFeedback(
      {
        conversation_id: "c1",
        tenant_slug: "acme",
        user_email: "u@acme.com",
        messages: [{ role: "user", content: "Hay un typo en el botón de guardar" }],
      },
      mockSupabase() as never,
    );

    expect(output.decision_type).toBe("auto_implement");
  });

  it('clasifica "nueva funcionalidad" como needs_approval', async () => {
    vi.mocked(llmGateway.llmCall).mockResolvedValue({
      content: JSON.stringify({
        decision_type: "needs_approval",
        criticality: "medium",
        reasoning: "Requiere producto",
        user_response: "Lo revisará el equipo.",
      }),
      model_used: "haiku",
      tokens_input: 1,
      tokens_output: 1,
      cost_usd: 0,
      cache_hit: false,
      latency_ms: 1,
    });

    const { output } = await analyzeFeedback(
      {
        conversation_id: "c1",
        tenant_slug: "acme",
        user_email: "u@acme.com",
        messages: [{ role: "user", content: "Quiero una nueva funcionalidad de exportación" }],
      },
      mockSupabase() as never,
    );

    expect(output.decision_type).toBe("needs_approval");
  });

  it("critical fuerza needs_approval", async () => {
    vi.mocked(llmGateway.llmCall).mockResolvedValue({
      content: JSON.stringify({
        decision_type: "auto_implement",
        criticality: "critical",
        reasoning: "Seguridad",
        user_response: "Escalado.",
      }),
      model_used: "haiku",
      tokens_input: 1,
      tokens_output: 1,
      cost_usd: 0,
      cache_hit: false,
      latency_ms: 1,
    });

    const { output } = await analyzeFeedback(
      {
        conversation_id: "c1",
        tenant_slug: "acme",
        user_email: "u@acme.com",
        messages: [{ role: "user", content: "Vulnerabilidad de seguridad en login" }],
      },
      mockSupabase() as never,
    );

    expect(output.criticality).toBe("critical");
    expect(output.decision_type).toBe("needs_approval");
  });
});
