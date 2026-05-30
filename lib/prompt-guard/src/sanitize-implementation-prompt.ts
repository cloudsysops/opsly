import { detectPromptInjection } from './detect-injection.js';
import { MAX_IMPLEMENTATION_PROMPT_LENGTH } from './constants.js';

export type ImplementationPromptSanitizeResult =
  | { ok: true; sanitized: string }
  | { ok: false; violations: string[] };

const BLOCKED_SHELL_PATTERNS: RegExp[] = [
  /\brm\s+-rf\b/i,
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bchmod\b/i,
  /\bsudo\b/i,
  /\bdoppler\b/i,
  /\bssh\b/i,
  /\bnpm\s+run\b/i,
  /\.\/scripts\//i,
  /\bACTIVE-PROMPT\b/i,
  /\bcursor-prompt-monitor\b/i,
  /```[\s\S]*?```/,
  /\$\([^)]+\)/,
  /`[^`]+`/,
];

const ALLOWED_URL_PREFIXES = ['https://github.com/cloudsysops/'];

function hasDisallowedUrl(text: string): boolean {
  const urls = text.match(/https?:\/\/[^\s)>'"]+/gi) ?? [];
  for (const raw of urls) {
    const allowed = ALLOWED_URL_PREFIXES.some((prefix) => raw.startsWith(prefix));
    if (!allowed) {
      return true;
    }
  }
  return false;
}

export function sanitizeImplementationPrompt(raw: string): ImplementationPromptSanitizeResult {
  const trimmed = raw.trim();
  const violations: string[] = [];

  if (!trimmed) {
    return { ok: false, violations: ['empty'] };
  }

  if (trimmed.length > MAX_IMPLEMENTATION_PROMPT_LENGTH) {
    violations.push('too_long');
  }

  const injection = detectPromptInjection(trimmed);
  if (injection.severity === 'high' || injection.severity === 'medium') {
    violations.push(...injection.reasons.map((r) => `injection:${r}`));
  }

  for (const pattern of BLOCKED_SHELL_PATTERNS) {
    if (pattern.test(trimmed)) {
      violations.push(`blocked_pattern:${pattern.source.slice(0, 40)}`);
    }
  }

  if (hasDisallowedUrl(trimmed)) {
    violations.push('external_url');
  }

  if (violations.length > 0) {
    return { ok: false, violations: [...new Set(violations)] };
  }

  const sanitized = trimmed.slice(0, MAX_IMPLEMENTATION_PROMPT_LENGTH);
  return { ok: true, sanitized };
}
