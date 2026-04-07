import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function ragQuery(
  tenantSlug: string,
  question: string,
  context: string[]
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: `Eres el asistente de ${tenantSlug}. Responde solo con el contexto dado.`,
    messages: [
      {
        role: "user",
        content: `Contexto:\n${context.join("\n\n---\n\n")}\n\nPregunta: ${question}`
      }
    ]
  });

  const first = response.content[0];
  return first && first.type === "text" ? first.text : "";
}
