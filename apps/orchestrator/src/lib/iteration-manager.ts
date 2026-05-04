import { promises as fsp } from 'fs';
import * as path from 'path';

/** Máximo de prompts de reintento automático (1-based en UX; ver `buildRetryPromptMarkdown`). */
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
  const tail = (summary.log_tail ?? '').toLowerCase();
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

interface ValidationError {
  type: 'type-check' | 'test' | 'build';
  message: string;
}

interface ValidationReport {
  job_id: string;
  timestamp: string;
  attempt: number;
  validations: Array<{
    type: 'type-check' | 'test' | 'build';
    status: 'passed' | 'failed' | 'skipped';
    error?: string;
  }>;
  overall_status: 'passed' | 'failed' | 'partial';
  can_retry: boolean;
  next_action: 'commit' | 'iterate' | 'escalate';
  errors: ValidationError[];
}

export interface IterationResult {
  shouldRetry: boolean;
  nextPrompt?: string;
  escalationReason?: string;
  suggestions: string[];
}

export class IterationManager {
  private cursorDir: string;

  constructor(cursorDir: string = '.cursor') {
    this.cursorDir = cursorDir;
  }

  async analyzeAndRefactor(
    jobId: string,
    attempt: number,
    errors: ValidationError[],
    originalPrompt: string,
    responseContent: string,
  ): Promise<IterationResult> {
    // Max attempts reached
    if (attempt >= 3) {
      return {
        shouldRetry: false,
        escalationReason: `Max retries (3) exceeded. Last errors:\n${errors.map((e) => `- [${e.type}] ${e.message}`).join('\n')}`,
        suggestions: [
          'Review error logs for common patterns',
          'Consider breaking task into smaller subtasks',
          'Escalate to human for manual intervention',
        ],
      };
    }

    // Analyze error patterns
    const errorPatterns = errors.map((e) => ({
      type: e.type,
      message: e.message,
      suggestion: this.suggestFix(e),
    }));

    // Generate refactoring prompt
    const nextPrompt = this.generateRefactoringPrompt(
      originalPrompt,
      responseContent,
      errorPatterns,
      attempt,
    );

    const suggestions = errorPatterns.map((p) => `[${p.type}] ${p.suggestion}`);

    return {
      shouldRetry: true,
      nextPrompt,
      suggestions,
    };
  }

  private suggestFix(error: ValidationError): string {
    const { type, message } = error;

    if (type === 'type-check') {
      if (message.includes('Cannot find module')) {
        return 'Import all required dependencies and check module paths';
      }
      if (message.includes('Type')) {
        return 'Review TypeScript type annotations - ensure all parameters and returns are properly typed';
      }
      if (message.includes('is not assignable')) {
        return 'Check type compatibility - ensure variables are used with correct types';
      }
    }

    if (type === 'test') {
      if (message.includes('Cannot find module')) {
        return 'Ensure all imports in test files are correct and dependencies are installed';
      }
      if (message.includes('expected')) {
        return 'Review test assertions - they should match the actual behavior of your implementation';
      }
      if (message.includes('ReferenceError')) {
        return 'Check that all variables and functions referenced in tests are defined';
      }
    }

    if (type === 'build') {
      if (message.includes('ENOENT')) {
        return 'Check that all required files exist - ensure no missing file references';
      }
      if (message.includes('permission')) {
        return 'Check file permissions and ensure build output directory is writable';
      }
    }

    return 'Review the error message carefully and fix the root cause - re-read the original requirement';
  }

  private generateRefactoringPrompt(
    originalPrompt: string,
    responseContent: string,
    errorPatterns: Array<{ type: string; message: string; suggestion: string }>,
    attempt: number,
  ): string {
    return `
# Refactoring Request (Attempt ${attempt + 1}/3)

The previous code had validation errors that need to be fixed.

## Validation Errors Found:

${errorPatterns.map((p) => `- **[${p.type}]** ${p.message}\n  **Suggestion:** ${p.suggestion}`).join('\n\n')}

## Original Request:

\`\`\`
${originalPrompt}
\`\`\`

## Previous Implementation (attempt ${attempt}):

\`\`\`
${responseContent}
\`\`\`

## What You Need to Do:

1. Carefully review each error listed above
2. Fix the issues in your code
3. Ensure the code passes:
   - TypeScript type checking (\`npm run type-check\`)
   - Unit tests (\`npm run test\`)
   - Build validation (\`npm run build\`)

4. Provide the corrected code that addresses all validation errors

Please provide the fixed implementation that will pass all validations.
`;
  }

  async generateRetryPrompt(
    jobId: string,
    validationReport: ValidationReport,
    originalPrompt: string,
  ): Promise<string> {
    const attempt = validationReport.attempt;

    // Collect all error messages
    const errorMessages = validationReport.errors
      .map((e) => `[${e.type}] ${e.message}`)
      .join('\n');

    // Generate refactoring suggestions
    const suggestions = validationReport.errors
      .map((e) => {
        const fix = this.suggestFix(e);
        return `- **${e.type}**: ${fix}`;
      })
      .join('\n');

    return `
# Code Refinement Required (Attempt ${attempt + 1}/3)

Your previous implementation has validation errors. Please fix them and provide corrected code.

## Errors to Fix:

\`\`\`
${errorMessages}
\`\`\`

## Suggested Fixes:

${suggestions}

## Original Task:

${originalPrompt}

## Instructions:

1. Review each error carefully
2. Fix the root causes
3. Ensure your code passes:
   - Type checking
   - Tests
   - Build

Provide the corrected implementation.
`;
  }

  async writeRetryPrompt(
    jobId: string,
    attempt: number,
    promptContent: string,
  ): Promise<string> {
    const promptsDir = path.join(this.cursorDir, 'prompts');
    const retryFilename = `retry-${jobId}-attempt-${attempt + 1}.md`;
    const retryPath = path.join(promptsDir, retryFilename);

    try {
      await fsp.mkdir(promptsDir, { recursive: true });
      await fsp.writeFile(
        retryPath,
        this.formatRetryPrompt(promptContent),
        'utf-8',
      );

      console.log(
        `[IterationManager] ✅ Created retry prompt: ${retryFilename}`,
      );
      return retryPath;
    } catch (err) {
      console.error('[IterationManager] ❌ Failed to write retry prompt:', err);
      throw err;
    }
  }

  private formatRetryPrompt(promptContent: string): string {
    // Add frontmatter if not present
    if (!promptContent.startsWith('---')) {
      return `---
agent_role: executor
max_steps: 5
goal: "Fix validation errors and refactor code"
---

${promptContent}`;
    }
    return promptContent;
  }

  async readValidationReport(
    responsePath: string,
  ): Promise<ValidationReport | null> {
    const validationPath = responsePath.replace(/\.md$/, '.validation.json');

    try {
      const content = await fsp.readFile(validationPath, 'utf-8');
      return JSON.parse(content) as ValidationReport;
    } catch (err) {
      console.log(
        `[IterationManager] No validation report found: ${validationPath}`,
      );
      return null;
    }
  }

  async shouldEscalate(validation: ValidationReport): Promise<boolean> {
    return validation.attempt >= 3 && validation.overall_status === 'failed';
  }

  async processValidationResult(
    responsePath: string,
    originalPrompt: string,
  ): Promise<{
    action: 'commit' | 'iterate' | 'escalate';
    nextPromptPath?: string;
    reason: string;
  }> {
    const validation = await this.readValidationReport(responsePath);

    if (!validation) {
      return {
        action: 'escalate',
        reason: 'No validation report found',
      };
    }

    // All passed
    if (validation.overall_status === 'passed') {
      return {
        action: 'commit',
        reason: `All validations passed on attempt ${validation.attempt}`,
      };
    }

    // Check if we should escalate
    if (await this.shouldEscalate(validation)) {
      return {
        action: 'escalate',
        reason: `Max attempts (3) exceeded. Final errors: ${validation.errors.map((e) => e.message).join('; ')}`,
      };
    }

    // Generate retry
    const nextPrompt = await this.generateRetryPrompt(
      validation.job_id,
      validation,
      originalPrompt,
    );

    const nextPromptPath = await this.writeRetryPrompt(
      validation.job_id,
      validation.attempt,
      nextPrompt,
    );

    return {
      action: 'iterate',
      nextPromptPath,
      reason: `Validation failed on attempt ${validation.attempt}. Generated retry prompt.`,
    };
  }
}

let instance: IterationManager | null = null;

export function getIterationManager(
  cursorDir?: string,
): IterationManager {
  if (!instance) {
    instance = new IterationManager(cursorDir);
  }
  return instance;
}
