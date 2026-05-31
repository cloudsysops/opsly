import { detectPromptInjection } from './detect-injection.js';
import {
  MAX_CHAT_USER_MESSAGE_LENGTH,
  MAX_FEEDBACK_MESSAGE_LENGTH,
  SAFE_INJECTION_RESPONSE_ES,
} from './constants.js';

export type MessageValidationResult =
  | { ok: true; message: string }
  | { ok: false; status: 400; error: string; safeResponse?: string };

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return text.slice(0, max);
}

export function validateFeedbackMessage(raw: string): MessageValidationResult {
  const message = raw.trim();
  if (!message) {
    return { ok: false, status: 400, error: 'message es requerido' };
  }

  if (message.length > MAX_FEEDBACK_MESSAGE_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `message excede ${MAX_FEEDBACK_MESSAGE_LENGTH} caracteres`,
    };
  }

  const injection = detectPromptInjection(message);
  if (injection.blocked) {
    return {
      ok: false,
      status: 400,
      error: 'message blocked by safety policy',
      safeResponse: SAFE_INJECTION_RESPONSE_ES,
    };
  }

  return { ok: true, message: truncate(message, MAX_FEEDBACK_MESSAGE_LENGTH) };
}

export function validateChatUserMessage(raw: string): MessageValidationResult {
  const message = raw.trim();
  if (!message) {
    return { ok: false, status: 400, error: 'message required' };
  }

  if (message.length > MAX_CHAT_USER_MESSAGE_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `message max ${MAX_CHAT_USER_MESSAGE_LENGTH} chars`,
    };
  }

  const injection = detectPromptInjection(message);
  if (injection.blocked) {
    return {
      ok: false,
      status: 400,
      error: 'message blocked by safety policy',
      safeResponse:
        'Gracias por escribirnos. Para agendar tu clase de prueba usa el formulario o WhatsApp.',
    };
  }

  return { ok: true, message: truncate(message, MAX_CHAT_USER_MESSAGE_LENGTH) };
}
