import { detectPromptInjection } from './detect-injection.js';
import { MAX_CHAT_OUTPUT_LENGTH } from './constants.js';

const SYSTEM_LEAK_PATTERNS: RegExp[] = [
  /\bEres el asistente de Opsly\b/i,
  /\b(system prompt|developer message|hidden instructions)\b/i,
  /\b(tenant_id|request_id)=/i,
  /\bOPENAI_API_KEY\b/i,
  /\bDOPPLER\b/i,
];

export function guardChatOutput(raw: string): string {
  let text = raw.trim();
  if (!text) {
    return 'Gracias por tu mensaje. Te responderemos pronto.';
  }

  for (const pattern of SYSTEM_LEAK_PATTERNS) {
    if (pattern.test(text)) {
      return 'Gracias por tu mensaje. Un asesor te contactará si hace falta más detalle.';
    }
  }

  const injection = detectPromptInjection(text);
  if (injection.blocked) {
    return 'Gracias por tu mensaje. Lo revisará nuestro equipo.';
  }

  if (text.length > MAX_CHAT_OUTPUT_LENGTH) {
    text = `${text.slice(0, MAX_CHAT_OUTPUT_LENGTH - 20)}… (mensaje acortado)`;
  }

  return text;
}
