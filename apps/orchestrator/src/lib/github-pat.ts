/**
 * PAT para la API REST de GitHub (ACTIVE-PROMPT, issues, etc.).
 * Prioridad: `GITHUB_TOKEN` (nombre estándar / CLI `gh`) y fallback `GITHUB_TOKEN_N8N` (legado, era el nombre en flujos n8n).
 */
export function resolveGithubPat(): string {
  const a = process.env.GITHUB_TOKEN?.trim();
  const b = process.env.GITHUB_TOKEN_N8N?.trim();
  return a || b || '';
}
