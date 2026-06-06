import { detectPromptInjection } from './detect-injection.js';

export type ActivePromptGuardResult =
  | { ok: true; content: string }
  | { ok: false; violations: string[] };

/** Kill-switch for local/dev: set OPSLY_ACTIVE_PROMPT_WRITES_DISABLED=1 */
export function assertActivePromptWriteAllowed(): void {
  if (process.env.OPSLY_ACTIVE_PROMPT_WRITES_DISABLED === '1') {
    throw new Error(
      'ACTIVE-PROMPT writes blocked (OPSLY_ACTIVE_PROMPT_WRITES_DISABLED=1)'
    );
  }
}

/**
 * Validates markdown destined for docs/ACTIVE-PROMPT.md — no shell, no injection.
 * Header lines (# ...) are metadata; body lines must pass per-line checks.
 */
export function guardActivePromptDocument(raw: string): ActivePromptGuardResult {
  const content = raw.trim();
  if (!content) {
    return { ok: false, violations: ['empty'] };
  }

  const documentCheck = detectPromptInjection(content);
  if (documentCheck.blocked) {
    return { ok: false, violations: documentCheck.reasons };
  }

  const violations: string[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const lineCheck = detectPromptInjection(trimmed);
    if (lineCheck.blocked) {
      violations.push(...lineCheck.reasons.map((r) => `line:${r}`));
    }
  }

  if (violations.length > 0) {
    return { ok: false, violations: [...new Set(violations)] };
  }

  return { ok: true, content };
}

export function guardActivePromptDocumentOrThrow(raw: string): string {
  assertActivePromptWriteAllowed();
  const result = guardActivePromptDocument(raw);
  if (!result.ok) {
    throw new Error(`ACTIVE-PROMPT blocked: ${result.violations.join(', ')}`);
  }
  return result.content;
}
