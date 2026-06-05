import { detectPromptInjection } from './detect-injection.js';
import { MAX_LLM_TEXT_PROMPT_LENGTH } from './constants.js';

export type LlmTextGuardResult =
  | { ok: true; prompt: string }
  | { ok: false; error: string; status: 400 };

export function guardLlmTextPrompt(raw: string): LlmTextGuardResult {
  const prompt = raw.trim();
  if (!prompt) {
    return { ok: false, error: 'prompt required', status: 400 };
  }

  if (prompt.length > MAX_LLM_TEXT_PROMPT_LENGTH) {
    return {
      ok: false,
      error: `prompt exceeds ${MAX_LLM_TEXT_PROMPT_LENGTH} characters`,
      status: 400,
    };
  }

  const injection = detectPromptInjection(prompt);
  if (injection.blocked) {
    return { ok: false, error: 'prompt blocked by safety policy', status: 400 };
  }

  return { ok: true, prompt };
}
