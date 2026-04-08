import { llmCallDirect } from "./llm-direct.js";

export interface QualityScoreResult {
  score: number;
  breakdown: string;
}

export async function scoreQuality(
  tenant_slug: string,
  originalRequest: string,
  constraintsSummary: string,
  responseContent: string,
): Promise<QualityScoreResult> {
  const prompt = `Eres un auditor de calidad de respuestas de LLM para un equipo de ingeniería.

Evalúa la RESPUESTA respecto al PEDIDO y CONSTRAINTS. Devuelve SOLO JSON:
{
  "score": number entero 0-100,
  "breakdown": "breve texto"
}

Criterios (suman 100):
- ¿Responde exactamente lo pedido? (40 pts)
- ¿Respeta constraints del proyecto? (30 pts)
- ¿Formato adecuado (markdown/código)? (20 pts)
- ¿Conciso sin ser incompleto? (10 pts)

PEDIDO:
${originalRequest.slice(0, 6000)}

CONSTRAINTS (resumen):
${constraintsSummary.slice(0, 2000)}

RESPUESTA:
${responseContent.slice(0, 8000)}
`;

  try {
    const res = await llmCallDirect({
      tenant_slug,
      model: "haiku",
      temperature: 0,
      cache: false,
      skip_usage_log: true,
      messages: [{ role: "user", content: prompt }],
    });
    const clean = res.content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as { score?: number; breakdown?: string };
    const s = Number(parsed.score);
    const score = Number.isFinite(s) ? Math.min(100, Math.max(0, Math.round(s))) : 65;
    return {
      score,
      breakdown: String(parsed.breakdown ?? "").slice(0, 500),
    };
  } catch {
    return { score: 70, breakdown: "fallback (scorer error)" };
  }
}
