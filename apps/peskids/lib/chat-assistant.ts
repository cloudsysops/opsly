import { randomUUID } from 'crypto';

const TENANT_SLUG = 'peskids';
const FALLBACK_REPLY =
  '¡Hola! Somos Peskids, academia de natación en Llanogrande (Medellín). Ofrecemos clases en sede o a domicilio. ' +
  'Para reservar una clase de prueba gratis, déjanos tu nombre y teléfono en el formulario de la página ' +
  'o escríbenos por WhatsApp. Un asesor te confirma horario en menos de 48 h.';

const SYSTEM_CONTEXT = `Eres el asistente virtual de Peskids, academia de natación para niños de 3 meses a 15 años en Llanogrande, Medellín.
Hay dos modalidades: clases en sede Llanogrande (Rionegro) y clases a domicilio en el área metropolitana.
Al agendar prueba, pide barrio o zona del acudiente para ubicación.
Responde en español (Colombia), tono cálido y breve (máximo 4 oraciones).
No inventes precios ni horarios exactos. Si piden reservar, invita al formulario de clase de prueba o WhatsApp.
Nunca prometas cupo sin confirmación humana. Si no sabes algo, di que un asesor dará seguimiento.`;

function llmGatewayUrl(): string {
  const base =
    process.env.LLM_GATEWAY_URL?.trim() || process.env.OPSLY_LLM_GATEWAY_URL?.trim() || '';
  if (!base) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'LLM_GATEWAY_URL is required in production (set in Doppler prd, e.g. http://172.17.0.1:3010 on VPS)'
      );
    }
    return 'http://127.0.0.1:3010';
  }
  if (base.includes('localhost') || base.includes('127.0.0.1')) {
    if (process.env.NODE_ENV === 'production' && !base.includes('172.17.0.1')) {
      throw new Error('LLM_GATEWAY_URL must not use localhost in production');
    }
  }
  return base.replace(/\/$/, '');
}

export type ChatAssistantResult = {
  reply: string;
  request_id: string;
  from_llm: boolean;
};

export async function generatePeskidsChatReply(
  userMessage: string,
  senderName?: string
): Promise<ChatAssistantResult> {
  const requestId = randomUUID();
  const prompt = `${SYSTEM_CONTEXT}\n\nVisitante${senderName ? ` (${senderName})` : ''} pregunta:\n${userMessage.trim()}`;

  try {
    const res = await fetch(`${llmGatewayUrl()}/v1/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_slug: TENANT_SLUG,
        tenant_plan: 'startup',
        request_id: requestId,
        task_type: 'generate',
        routing_bias: 'cost',
        feature: 'peskids_chat_widget',
        prompt,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      console.warn('LLM gateway chat failed:', res.status, await res.text());
      return { reply: FALLBACK_REPLY, request_id: requestId, from_llm: false };
    }

    const body = (await res.json()) as { content?: string };
    const content = body.content?.trim();
    if (!content) {
      return { reply: FALLBACK_REPLY, request_id: requestId, from_llm: false };
    }

    return { reply: content, request_id: requestId, from_llm: true };
  } catch (err) {
    console.warn('LLM gateway unreachable:', err);
    return { reply: FALLBACK_REPLY, request_id: requestId, from_llm: false };
  }
}

export async function triggerN8nMessagePipeline(
  messageId: string,
  messageText: string
): Promise<void> {
  const base = process.env.N8N_WEBHOOK_BASE_URL?.replace(/\/$/, '');
  if (!base) return;

  const url = `${base}/peskids-message-pipeline`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id: messageId,
        message_text: messageText,
        tenant_id: TENANT_SLUG,
      }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    console.warn('n8n message pipeline webhook failed:', err);
  }
}
