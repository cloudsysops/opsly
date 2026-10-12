/**
 * Best-effort secret redaction for anything persisted from a tmux pane or command line.
 * Pane output is untrusted: it can contain tokens echoed by tools, so it is redacted
 * before it reaches session JSON, logs, or API responses.
 */
const REDACTION_RULES: Array<[RegExp, string]> = [
  // Authorization: Bearer xxx / Bearer xxx
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, '$1 ***'],
  // key=value / key: value for common secret-like names
  [
    /\b([A-Za-z0-9_]*(?:token|password|passwd|secret|api[_-]?key|apikey|authorization)[A-Za-z0-9_]*)(["']?\s*[=:]\s*)(?!\*\*\*)("(?:[^"\\]|\\.)*(?:"|$)|'(?:[^'\\]|\\.)*(?:'|$)|[^\s"']+)/gi,
    '$1$2***',
  ],
  // Well-known token shapes
  [/\bsk-[A-Za-z0-9_-]{8,}/g, 'sk-***'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/g, 'gh*_***'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/g, 'xox*-***'],
  [/\bAKIA[0-9A-Z]{16}\b/g, 'AKIA***'],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, 'eyJ***'],
];

export function redactSecrets(text: string): string {
  let out = text;
  for (const [pattern, replacement] of REDACTION_RULES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** Redacts, drops trailing blank lines, and keeps the last `maxChars` characters. */
export function compactPaneTail(text: string, maxChars = 500): string {
  const trimmed = redactSecrets(text).replace(/\s+$/u, '');
  return trimmed.length > maxChars ? trimmed.slice(-maxChars) : trimmed;
}
