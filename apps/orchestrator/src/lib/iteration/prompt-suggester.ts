import type { AgentPattern } from '../training/agent-trainer.js';

export interface SuggestionContext {
  last_prompt: string;
  last_result: string;
  task_goal: string;
  agent_role: 'cursor' | 'claude' | 'copilot' | 'opencode';
  iteration: number;
}

export interface PromptSuggestion {
  next_prompt: string;
  reasoning: string;
  agent_role: 'cursor' | 'claude' | 'copilot' | 'opencode';
  confidence: number;
  is_refinement: boolean;
  estimated_complexity: 'low' | 'medium' | 'high';
}

export class PromptSuggester {
  /**
   * Generate next prompt based on result analysis
   */
  static suggest(
    context: SuggestionContext,
    patterns?: AgentPattern[],
  ): PromptSuggestion {
    // Check if task is complete
    if (context.iteration >= 5) {
      return {
        next_prompt: `
---
agent_role: ${context.agent_role}
max_steps: 3
---

The task has reached maximum iterations (5).
Please review and summarize what was accomplished:

${context.task_goal}

Result so far:
\`\`\`
${context.last_result}
\`\`\`

Was the goal achieved? What was completed?
`,
        reasoning: 'Task reached max iterations - requesting summary',
        agent_role: context.agent_role,
        confidence: 0.8,
        is_refinement: false,
        estimated_complexity: 'low',
      };
    }

    // Analyze if result is incomplete
    const isIncomplete = this.isResultIncomplete(context.last_result, context.task_goal);
    const hasErrors = this.hasErrors(context.last_result);

    if (hasErrors) {
      // Error refinement prompt
      return {
        next_prompt: this.generateErrorRefinementPrompt(context),
        reasoning: 'Errors detected in result - requesting fix',
        agent_role: context.agent_role,
        confidence: 0.85,
        is_refinement: true,
        estimated_complexity: 'medium',
      };
    }

    if (isIncomplete) {
      // Completion prompt
      const nextStep = this.suggestNextStep(context, patterns);
      return {
        next_prompt: this.generateCompletionPrompt(context, nextStep),
        reasoning: `Task incomplete. Next step: ${nextStep}`,
        agent_role: context.agent_role,
        confidence: 0.8,
        is_refinement: true,
        estimated_complexity: 'medium',
      };
    }

    // Task appears complete
    return {
      next_prompt: `---
agent_role: ${context.agent_role}
max_steps: 2
---

Review completed:

Goal: ${context.task_goal}

Result:
\`\`\`
${context.last_result}
\`\`\`

Confirm this task is complete and ready. Provide a one-line summary.
`,
      reasoning: 'Task appears complete - requesting confirmation',
      agent_role: context.agent_role,
      confidence: 0.9,
      is_refinement: false,
      estimated_complexity: 'low',
    };
  }

  private static isResultIncomplete(result: string, goal: string): boolean {
    const lowerResult = result.toLowerCase();
    const lowerGoal = goal.toLowerCase();

    // Check for incomplete markers
    if (
      lowerResult.includes('todo') ||
      lowerResult.includes('fixme') ||
      lowerResult.includes('incomplete') ||
      lowerResult.includes('wip')
    ) {
      return true;
    }

    // Check if goal keywords are present in result
    const goalKeywords = lowerGoal
      .split(/\W+/)
      .filter((w) => w.length > 3)
      .slice(0, 3);
    const resultKeywords = new Set(lowerResult.split(/\W+/));
    const coverage = goalKeywords.filter((k) => resultKeywords.has(k)).length / goalKeywords.length;

    return coverage < 0.7;
  }

  private static hasErrors(result: string): boolean {
    const errorPatterns = [
      /error/i,
      /failed/i,
      /exception/i,
      /undefined/i,
      /cannot find/i,
      /not defined/i,
      /is not assignable/i,
      /missing/i,
    ];

    return errorPatterns.some((pattern) => pattern.test(result));
  }

  private static generateErrorRefinementPrompt(context: SuggestionContext): string {
    return `---
agent_role: ${context.agent_role}
max_steps: 5
---

Previous attempt had errors. Please fix:

Goal: ${context.task_goal}

Previous result:
\`\`\`
${context.last_result}
\`\`\`

Issues found:
- Type mismatches or missing imports
- Incomplete implementation
- Logic errors

Please provide corrected version without TODOs or placeholders.
`;
  }

  private static suggestNextStep(
    context: SuggestionContext,
    patterns?: AgentPattern[],
  ): string {
    // Use patterns if available
    if (patterns && patterns.length > 0) {
      const pattern = patterns[0];
      if (pattern.typical_sequence.length > 0) {
        return pattern.typical_sequence[0];
      }
    }

    // Heuristic based on result
    const result = context.last_result.toLowerCase();
    if (!result.includes('type') && !result.includes('interface')) return 'Add TypeScript types';
    if (!result.includes('test')) return 'Add tests';
    if (!result.includes('error') && !result.includes('catch')) return 'Add error handling';
    if (!result.includes('comment') && !result.includes('doc')) return 'Add documentation';

    return 'Code review and optimization';
  }

  private static generateCompletionPrompt(context: SuggestionContext, nextStep: string): string {
    return `---
agent_role: ${context.agent_role}
max_steps: 5
---

Continue the task. Next step: ${nextStep}

Goal: ${context.task_goal}

Current code:
\`\`\`
${context.last_result}
\`\`\`

${nextStep === 'Add TypeScript types' ? 'Add proper TypeScript interfaces and type annotations.' : ''}
${nextStep === 'Add tests' ? 'Write unit tests covering main functionality and edge cases.' : ''}
${nextStep === 'Add error handling' ? 'Add error handling with meaningful error messages.' : ''}
${nextStep === 'Add documentation' ? 'Add JSDoc comments and README documentation.' : ''}
${nextStep === 'Code review and optimization' ? 'Review code for quality, performance, and best practices.' : ''}

Provide complete, working code ready for production.
`;
  }
}
