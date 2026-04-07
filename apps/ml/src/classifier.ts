import { llmCall } from "@intcloudsysops/llm-gateway";
import { z } from "zod";

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
  const result = await llmCall({
    tenant_slug: tenantSlug,
    system: `Eres clasificador de leads para ${tenantSlug}. Responde solo JSON valido.`,
    messages: [{
      role: "user",
      content:
        `Conversacion: ${conversation}\n\n` +
        `Responde en JSON con score, category, next_action y reasoning`
    }],
    model: "sonnet",
    max_tokens: 500,
    temperature: 0,
  });
  const clean = result.content.replaceAll(/```json|```/g, "").trim();
  const parsed = LeadClassificationSchema.safeParse(JSON.parse(clean) as unknown);
  if (!parsed.success) {
    throw new Error("Lead classification payload invalido");
  }
  return parsed.data;
}
