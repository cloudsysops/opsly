/**
 * Best-effort secret redaction for anything persisted from a tmux pane or command line.
 * Pane output is untrusted: it can contain tokens echoed by tools, so it is redacted
 * before it reaches session JSON, logs, or API responses.
 */
const REDACTION_RULES: Array<[RegExp, string]> = [
  // Authorization: Bearer xxx / Bearer xxx
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, '$1 ***'],
  // Authorization with any scheme (Bearer, Basic, Token, ApiKey, Digest, AWS4-HMAC-SHA256 ...):
  // redact the whole value to the end of the line. Multi-field schemes carry several credential
  // components (`Digest username="...", response="..."`, `... Signature=...`), so stopping at the
  // first token would leave the rest in place. Over-redacting trailing arguments is deliberate.
  [/\b(authorization["']?\s*[=:]\s*)(?!\*\*\*)[^\n]*/gi, '$1***'],
  // key=value / key: value for common secret-like names
  [
    /\b([A-Za-z0-9_]*(?:token|password|passwd|secret|api[_-]?key|apikey|authorization)[A-Za-z0-9_]*)(["']?\s*[=:]\s*)(?!\*\*\*)("(?:[^"\\]|\\.)*(?:"|$)|'(?:[^'\\]|\\.)*(?:'|$)|[^\s"']+)/gi,
    '$1$2***',
  ],
  // Space-separated CLI flags: `--password hunter2`, `--api-key abc`, `--token=abc` is handled above.
  [
    /(--?(?:password|passwd|pass|token|secret|api[-_]?key|apikey|access[-_]?token|client[-_]?secret|auth(?:orization)?)\b)(\s+)(?!\*\*\*)("[^"]*(?:"|$)|'[^']*(?:'|$)|\S+)/gi,
    '$1$2***',
  ],
  // `... set token <value>` / `config set _authToken <value>`
  [
    /\b(set\s+(?:\S+\s+)?)([A-Za-z0-9_]*(?:token|password|passwd|secret|api[_-]?key)[A-Za-z0-9_]*)(\s+)(?!\*\*\*)("[^"]*(?:"|$)|'[^']*(?:'|$)|\S+)/gi,
    '$1$2$3***',
  ],
  // `docker login -u bob -p secret`: `-p` is only a password for `login`; elsewhere it is a port
  // or other option (`docker run -p 8080:80`), so the rule is command-aware.
  [
    /\b((?:docker|podman|nerdctl)\b[^\n|;&]*?\blogin\b[^\n|;&]*?\s-p)(\s+)(?!\*\*\*)("[^"]*(?:"|$)|'[^']*(?:'|$)|\S+)/gi,
    '$1$2***',
  ],
  // `--user alice:secret` / `-u alice:secret`
  [/(--user|-u)(\s+)([^\s:]+):(?!\*\*\*)(\S+)/g, '$1$2$3:***'],
  // Credentials embedded in a URL: scheme://user:secret@host
  [/(\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:)(?!\*\*\*)([^\s@/]+)(@)/gi, '$1***$3'],
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
