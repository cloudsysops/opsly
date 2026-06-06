/** Max chars for portal feedback user message. */
export const MAX_FEEDBACK_MESSAGE_LENGTH = 8_000;

/** Max chars for public / tenant chat user message. */
export const MAX_CHAT_USER_MESSAGE_LENGTH = 2_000;

/** Max chars for LLM Gateway /v1/text prompt body. */
export const MAX_LLM_TEXT_PROMPT_LENGTH = 16_000;

/** Max chars for implementation_prompt written to ACTIVE-PROMPT. */
export const MAX_IMPLEMENTATION_PROMPT_LENGTH = 6_000;

/** Max chars returned to end users from chat assistants. */
export const MAX_CHAT_OUTPUT_LENGTH = 4_000;

export const SAFE_INJECTION_RESPONSE_ES =
  'Recibimos tu mensaje. Un miembro del equipo lo revisará pronto. Si necesitas ayuda urgente, contacta soporte desde el portal.';
