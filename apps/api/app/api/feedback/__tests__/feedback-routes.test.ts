import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as feedbackGet, POST as feedbackPost } from "../route";
import { POST as approvePost } from "../approve/route";
import * as supabaseMod from "../../../../lib/supabase";

vi.mock("../../../../lib/supabase", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@intcloudsysops/llm-gateway", () => ({
  llmCall: vi.fn(),
}));

vi.mock("@intcloudsysops/ml/feedback-decision-engine", () => ({
  analyzeFeedback: vi.fn(),
  executeAutoImplement: vi.fn(),
}));

vi.mock("../../../../lib/feedback-notify", () => ({
  notifyDiscordFeedback: vi.fn(),
}));

import {
  analyzeFeedback,
  executeAutoImplement,
} from "@intcloudsysops/ml/feedback-decision-engine";

function chainableSupabaseForPost() {
  return {
    schema: () => ({
      from: (table: string) => {
        if (table === "feedback_messages") {
          return {
            insert: async () => ({ error: null }),
            select: () => ({
              eq: () => ({
                order: async () => ({
                  data: [
                    { role: "user", content: "primera" },
                    { role: "user", content: "x".repeat(120) },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      },
    }),
  };
}

describe("/api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = "admin-secret-token";
  });

  it("GET sin token → 401", async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({} as never);
    const res = await feedbackGet(
      new NextRequest(new URL("http://localhost/api/feedback")),
    );
    expect(res.status).toBe(401);
  });

  it("GET con token válido consulta supabase", async () => {
    const final = Promise.resolve({
      data: [{ id: "1", tenant_slug: "t", user_email: "e", status: "open" }],
      error: null,
    });
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => final,
    };
    const from = vi.fn().mockReturnValue(builder);
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      schema: () => ({ from }),
    } as never);

    const res = await feedbackGet(
      new NextRequest(new URL("http://localhost/api/feedback"), {
        headers: { "x-admin-token": "admin-secret-token" },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { feedbacks: unknown[] };
    expect(Array.isArray(body.feedbacks)).toBe(true);
  });

  it("POST sin campos requeridos → 400", async () => {
    const res = await feedbackPost(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST con mensaje largo dispara análisis ML", async () => {
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(chainableSupabaseForPost() as never);
    vi.mocked(analyzeFeedback).mockResolvedValue({
      output: {
        decision_type: "needs_approval",
        criticality: "medium",
        reasoning: "test",
        user_response: "Gracias",
        notify_discord: false,
      },
      decision_id: "d1",
    });

    const res = await feedbackPost(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_slug: "acme",
          user_email: "u@acme.com",
          message: "x".repeat(120),
          conversation_id: "conv-1",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(analyzeFeedback).toHaveBeenCalled();
    expect(executeAutoImplement).not.toHaveBeenCalled();
  });
});

describe("/api/feedback/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = "admin-secret-token";
  });

  it("sin token → 401", async () => {
    const res = await approvePost(
      new Request("http://localhost/api/feedback/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision_id: "x", approved: true }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("con token y approved llama executeAutoImplement", async () => {
    const updateDec = vi.fn().mockReturnValue({ eq: async () => ({ error: null }) });
    const updateConv = vi.fn().mockReturnValue({ eq: async () => ({ error: null }) });
    const from = vi.fn((table: string) => {
      if (table === "feedback_decisions") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: "dec-1",
                  conversation_id: "c1",
                  implementation_prompt: "haz X",
                  feedback_conversations: { tenant_slug: "acme" },
                },
                error: null,
              }),
            }),
          }),
          update: updateDec,
        };
      }
      if (table === "feedback_conversations") {
        return { update: updateConv };
      }
      return {};
    });

    vi.mocked(supabaseMod.getServiceClient).mockReturnValue({
      schema: () => ({ from }),
    } as never);

    const res = await approvePost(
      new Request("http://localhost/api/feedback/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": "admin-secret-token",
        },
        body: JSON.stringify({ decision_id: "dec-1", approved: true }),
      }),
    );

    expect(res.status).toBe(200);
    expect(executeAutoImplement).toHaveBeenCalledWith(
      "dec-1",
      "haz X",
      "acme",
    );
  });
});
