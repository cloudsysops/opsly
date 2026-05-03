/** Autonomous retry loop: interpret validation output and draft follow-up prompts. */

export const MAX_AUTO_ITERATIONS = 3;

export interface ValidationReportSummary {
  ok: boolean;
  correlation_id: string;
  attempt: number;
  failed_step?: 'type-check' | 'test' | 'build';
  exit_code?: number;
  log_tail: string;
  source_prompt_path?: string;
}

export function extractTypeScriptErrorLines(log: string, maxLines = 24): string[] {
  const lines = log.split('\n');
  const hits: string[] = [];
  for (const line of lines) {
    if (/error\s+TS\d+/i.test(line) || /\berror TS\d+\b/.test(line)) {
      hits.push(line.trim());
      if (hits.length >= maxLines) {
        break;
      }
    }
  }
  return hits;
}

export function suggestFixHints(summary: ValidationReportSummary): string[] {
  const hints: string[] = [];
  const tail = summary.log_tail.toLowerCase();
  if (tail.includes('cannot find module') || tail.includes('cannot find name')) {
    hints.push('Revisa imports y paths de módulos; alinea `tsconfig` references del monorepo.');
  }
  if (tail.includes('is not assignable to type')) {
    hints.push('Ajusta tipos explícitos o estrecha uniones; evita `any`.');
  }
  if (tail.includes('not all code paths return')) {
    hints.push('Completa todos los return branches o lanza en casos imposibles.');
  }
  if (summary.failed_step === 'test') {
    hints.push('Ejecuta el test fallido aislado con Vitest/Jest y corrige expectativas o implementación.');
  }
  if (summary.failed_step === 'build') {
    hints.push('Revisa errores de bundler/Next; a veces faltan env vars en build time.');
  }
  if (hints.length === 0) {
    hints.push('Lee el log completo del paso fallido y corrige la causa raíz antes de reintentar.');
  }
  return hints;
}

/**
 * Markdown body for a new prompt file under `.cursor/prompts/`.
 * Caller should persist with a unique filename.
 */
export function buildRetryPromptMarkdown(input: {
  summary: ValidationReportSummary;
  nextAttempt: number;
  maxAttempts: number;
  originalGoal?: string;
}): string {
  const { summary, nextAttempt, maxAttempts, originalGoal } = input;
  const tsLines = extractTypeScriptErrorLines(summary.log_tail);
  const hints = suggestFixHints(summary);
  const goalBlock =
    originalGoal && originalGoal.trim().length > 0
      ? `\n## Objetivo original\n\n${originalGoal.trim()}\n`
      : '';

  const errorsBlock =
    tsLines.length > 0
      ? `\n## Errores TypeScript (extracto)\n\n${tsLines.map((l) => `- ${l}`).join('\n')}\n`
      : '';

  return `---
agent: cursor
agent_role: executor
max_steps: 5
iteration_attempt: ${String(nextAttempt)}
max_iterations: ${String(maxAttempts)}
correlation_id: ${summary.correlation_id}
source_prompt_path: ${summary.source_prompt_path ?? ''}
---

# Reintento automático (${String(nextAttempt)}/${String(maxAttempts)})

La validación del repo **falló** en el paso **${summary.failed_step ?? 'unknown'}** (exit ${String(summary.exit_code ?? 'n/a')}).

${goalBlock}

## Sugerencias

${hints.map((h) => `- ${h}`).join('\n')}
${errorsBlock}

## Fragmento de log (cola)

\`\`\`text
${truncateTail(summary.log_tail, 6000)}
\`\`\`

Corrige el código, mantén el alcance mínimo y deja el árbol listo para otra validación.
`;
}

export function truncateTail(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `…(truncado)\n${text.slice(-maxChars)}`;
}

export function safeCorrelationFileId(correlationId: string): string {
  return correlationId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}
