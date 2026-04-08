import { llmCallDirect } from "./llm-direct.js";
import type { AffectedArea, DetectedIntent, IntentKind, UrgencyLevel } from "./types.js";

const INTENT_SYSTEM = `Eres un clasificador de intenciones para Opsly (plataforma SaaS multi-tenant).
Responde SOLO JSON válido sin markdown, con esta forma exacta:
{
  "intent": "bug_fix" | "feature_request" | "refactor" | "question" | "deploy" | "analysis" | "config",
  "confidence": number entre 0 y 1,
  "affected_area": "frontend" | "backend" | "infra" | "ml",
  "urgency": "low" | "medium" | "high" | "critical",
  "suggested_team": string (ej. "frontend-team", "backend-team", "infra-team", "ml-team")
}`;

const TEAMS: Record<string, string> = {
  frontend: "frontend-team",
  backend: "backend-team",
  infra: "infra-team",
  ml: "ml-team",
};

function coerceIntent(raw: string): IntentKind {
  const allowed: IntentKind[] = [
    "bug_fix",
    "feature_request",
    "refactor",
    "question",
    "deploy",
    "analysis",
    "config",
  ];
  const t = raw.trim() as IntentKind;
  return allowed.includes(t) ? t : "question";
}

function coerceArea(raw: string): AffectedArea {
  const a = raw.trim() as AffectedArea;
  if (a === "frontend" || a === "backend" || a === "infra" || a === "ml") {
    return a;
  }
  return "backend";
}

function coerceUrgency(raw: string): UrgencyLevel {
  const u = raw.trim() as UrgencyLevel;
  if (u === "low" || u === "medium" || u === "high" || u === "critical") {
    return u;
  }
  return "medium";
}

export function fallbackIntent(userMessage: string): DetectedIntent {
  const lower = userMessage.toLowerCase();
  let intent: IntentKind = "question";
  if (/bug|error|falla|romp|crash|500|404/.test(lower)) intent = "bug_fix";
  else if (/feature|nueva funcionalidad|implementar|añadir/.test(lower)) intent = "feature_request";
  else if (/refactor|limpiar código|deuda técnica/.test(lower)) intent = "refactor";
  else if (/deploy|despliegue|pipeline|ci\//.test(lower)) intent = "deploy";
  else if (/analiza|métrica|datos|audita/.test(lower)) intent = "analysis";
  else if (/config|env\.|doppler|variable/.test(lower)) intent = "config";

  const area: AffectedArea =
    /docker|compose|traefik|vps|infra/.test(lower) ? "infra" : /ml|modelo|embedding/.test(lower) ? "ml" : "backend";

  return {
    intent,
    confidence: 0.55,
    affected_area: area,
    urgency: /urgente|crítico|producción/.test(lower) ? "high" : "medium",
    suggested_team: TEAMS[area] ?? "backend-team",
  };
}

export async function detectIntent(
  tenant_slug: string,
  userMessage: string,
): Promise<DetectedIntent> {
  try {
    const res = await llmCallDirect({
      tenant_slug,
      model: "haiku",
      temperature: 0,
      cache: true,
      skip_usage_log: true,
      system: INTENT_SYSTEM,
      messages: [
        {
          role: "user",
          content: `MENSAJE_USUARIO:\n${userMessage}`,
        },
      ],
    });
    const clean = res.content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as Record<string, unknown>;
    const conf = Number(parsed.confidence);
    const area = coerceArea(String(parsed.affected_area ?? "backend"));
    return {
      intent: coerceIntent(String(parsed.intent ?? "question")),
      confidence: Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0.8,
      affected_area: area,
      urgency: coerceUrgency(String(parsed.urgency ?? "medium")),
      suggested_team: String(parsed.suggested_team ?? TEAMS[area] ?? "backend-team").slice(0, 64),
    };
  } catch {
    return fallbackIntent(userMessage);
  }
}
