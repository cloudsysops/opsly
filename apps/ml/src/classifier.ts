import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface LeadClassification {
  score: number;
  category: "hot" | "warm" | "cold";
  next_action: string;
  reasoning: string;
}

const LeadClassificationSchema = z.object({
  score: z.number().min(0).max(100),
  category: z.enum(["hot", "warm", "cold"]),
  next_action: z.string().min(1),
  reasoning: z.string().min(1),
});

export async function classifyLead(
  tenantSlug: string,
  conversation: string
): Promise<LeadClassification> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: `Eres clasificador de leads para ${tenantSlug}. Responde solo JSON valido.`,
    messages: [
      {
        role: "user",
        content:
          `Conversacion: ${conversation}\n\n` +
          `Responde en JSON con score, category, next_action y reasoning`
      }
    ]
  });

  const first = response.content[0];
  if (first?.type !== "text") {
    throw new Error("Respuesta inesperada de Claude");
  }

  const clean = first.text.replaceAll(/```json|```/g, "").trim();
  const parsed = LeadClassificationSchema.safeParse(JSON.parse(clean) as unknown);
  if (!parsed.success) {
    throw new Error("Lead classification payload invalido");
  }
  return parsed.data;
}
