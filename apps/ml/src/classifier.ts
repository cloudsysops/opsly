import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface LeadClassification {
  score: number;
  category: "hot" | "warm" | "cold";
  next_action: string;
  reasoning: string;
}

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
  if (!first || first.type !== "text") {
    throw new Error("Respuesta inesperada de Claude");
  }

  const clean = first.text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as LeadClassification;
}
