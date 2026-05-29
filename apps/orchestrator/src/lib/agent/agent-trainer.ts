import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const DEFAULT_VALIDATION_CHECKS = ['type-check', 'test', 'build'];
const DEFAULT_PATTERN_LIMIT = 100;

export interface ExecutionRecord {
  jobId: string;
  agentRole: string;
  prompt: string;
  result: string;
  duration: number;
  iterationCount: number;
  success: boolean;
  failedChecks?: string[];
  timestamp: string;
}

export interface DecisionRecord {
  jobId: string;
  action: 'commit' | 'iterate' | 'escalate';
  agentRole: string;
  intent: string;
  iterationCount: number;
  validationTime: number;
  failedChecks?: string[];
  timestamp: string;
}

export interface ExecutionPattern {
  agentRole: string;
  intent: string;
  promptPattern: string;
  successRate: number;
  avgIterations: number;
  totalExecutions: number;
  commonErrors: string[];
  typicalSequence: string[];
}

export interface PatternSuggestion {
  nextPrompt: string;
  confidence: number;
  rationale: string;
  commonErrorsInPattern: string[];
}

/**
 * AgentTrainer: Records execution outcomes and learns patterns
 * Enables autonomous iteration through pattern recognition
 */
export class AgentTrainer {
  private supabase: SupabaseClient | null;
  private executionHistory: Map<string, ExecutionRecord> = new Map();
  private decisionHistory: Map<string, DecisionRecord> = new Map();

  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';

    if (!url || !key) {
      console.warn('[AgentTrainer] Supabase credentials not configured, patterns disabled');
      this.supabase = null;
    } else {
      try {
        this.supabase = createClient(url, key, {
          auth: { persistSession: false },
        });
      } catch (err) {
        // In Node.js 20 CI, realtime websocket bootstrap can throw at client creation time.
        console.warn('[AgentTrainer] Supabase client unavailable, patterns disabled:', err);
        this.supabase = null;
      }
    }

    this.startCleanupSchedule();
  }

  private startCleanupSchedule(): void {
    this.cleanupInterval = setInterval(
      () => {
        this.clearOldMemory(30 * 60 * 1000); // Clear entries older than 30 minutes
      },
      30 * 60 * 1000
    ); // Run every 30 minutes
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Record execution details for pattern learning
   */
  async recordExecution(
    prompt: string,
    agentRole: string,
    result: string,
    duration: number,
    iterationCount: number,
    success: boolean = false,
    failedChecks?: string[]
  ): Promise<boolean> {
    const record: ExecutionRecord = {
      jobId: crypto.randomUUID(),
      agentRole,
      prompt,
      result,
      duration,
      iterationCount,
      success,
      failedChecks,
      timestamp: new Date().toISOString(),
    };

    // Store in memory for quick access
    this.executionHistory.set(record.jobId, record);

    // Persist to database if available
    if (!this.supabase) {
      console.warn('[AgentTrainer] Cannot record execution: Supabase not configured');
      return false;
    }

    try {
      const { error } = await this.supabase.from('agent_executions').insert([
        {
          job_id: record.jobId,
          agent_role: agentRole,
          prompt_hash: this.hashPrompt(prompt),
          result_hash: this.hashPrompt(result),
          duration_ms: duration,
          iteration_count: iterationCount,
          success,
          failed_checks: failedChecks || [],
          created_at: record.timestamp,
        },
      ]);

      if (error) {
        console.error('[AgentTrainer] Failed to record execution:', error);
        return false;
      }

      console.log(`[AgentTrainer] ✅ Recorded execution for job ${record.jobId}`);
      return true;
    } catch (err) {
      console.error('[AgentTrainer] Exception recording execution:', err);
      return false;
    }
  }

  /**
   * Record decision made by validation system
   */
  async recordDecision(
    jobId: string,
    action: 'commit' | 'iterate' | 'escalate',
    agentRole: string,
    intent: string,
    iterationCount: number = 1,
    validationTime: number = 0,
    failedChecks?: string[]
  ): Promise<boolean> {
    const record: DecisionRecord = {
      jobId,
      action,
      agentRole,
      intent,
      iterationCount,
      validationTime,
      failedChecks,
      timestamp: new Date().toISOString(),
    };

    // Store in memory
    this.decisionHistory.set(jobId, record);

    // This data should be captured via validation_metrics table
    console.log(
      `[AgentTrainer] 📊 Decision recorded: ${action} for ${agentRole} on intent ${intent}`
    );

    return true;
  }

  /**
   * Get patterns for an agent role and intent
   * Returns aggregated statistics from past executions
   */
  async getPatterns(agentRole: string, intent: string): Promise<ExecutionPattern | null> {
    if (!this.supabase) {
      console.warn('[AgentTrainer] Cannot get patterns: Supabase not configured');
      return null;
    }

    try {
      const { data, error } = await this.supabase
        .from('agent_execution_patterns')
        .select('*')
        .eq('agent_role', agentRole)
        .eq('intent', intent)
        .maybeSingle();

      if (error) {
        console.error('[AgentTrainer] Failed to get patterns:', error);
        return null;
      }

      if (!data) {
        console.log(
          `[AgentTrainer] No patterns found for ${agentRole} / ${intent} (needs >10 executions)`
        );
        return null;
      }

      return {
        agentRole: data.agent_role,
        intent: data.intent,
        promptPattern: data.prompt_pattern || '',
        successRate: data.success_rate || 0,
        avgIterations: data.avg_iterations || 1,
        totalExecutions: data.total_executions || 0,
        commonErrors: data.common_errors || [],
        typicalSequence: data.typical_sequence || [],
      };
    } catch (err) {
      console.error('[AgentTrainer] Exception getting patterns:', err);
      return null;
    }
  }

  /**
   * Suggest next prompt based on past patterns and results
   * Uses LLM-inspired prompting to refine iterations
   */
  async suggestNextPrompt(
    lastPrompt: string,
    lastResult: string,
    patterns: ExecutionPattern | null
  ): Promise<PatternSuggestion> {
    let confidence = 0.3; // Base confidence without patterns
    let rationale = 'Generated suggestion without historical patterns';
    let commonErrors: string[] = [];

    // If patterns exist, use them to inform suggestion
    if (patterns && patterns.totalExecutions >= 10) {
      confidence = Math.min(patterns.successRate + 0.2, 0.95);
      rationale = `Based on ${patterns.totalExecutions} past executions with ${Math.round(patterns.successRate * 100)}% success rate`;
      commonErrors = patterns.commonErrors || [];

      // Adjust prompt based on typical sequence and common errors
      if (patterns.typicalSequence && patterns.typicalSequence.length > 0) {
        rationale += `. Typical sequence: ${patterns.typicalSequence.join(' → ')}`;
      }
    }

    // Generate refined prompt that addresses common errors
    const nextPrompt = this.refinePromptWithPatterns(
      lastPrompt,
      lastResult,
      commonErrors,
      patterns
    );

    return {
      nextPrompt,
      confidence,
      rationale,
      commonErrorsInPattern: commonErrors,
    };
  }

  /**
   * Generate refined prompt based on patterns and errors
   */
  private refinePromptWithPatterns(
    originalPrompt: string,
    lastResult: string,
    commonErrors: string[],
    patterns: ExecutionPattern | null
  ): string {
    let refinedPrompt = originalPrompt;

    // If common errors exist, prepend guidance to avoid them
    if (commonErrors.length > 0) {
      const errorContext = `
## Known Issues to Avoid:
${commonErrors.map((err) => `- ${err}`).join('\n')}

## Instructions:
Review the errors above carefully and ensure your solution specifically addresses them.

---

## Original Task:
`;
      refinedPrompt = errorContext + originalPrompt;
    }

    // If we have pattern sequence, add guidance about expected steps
    if (patterns?.typicalSequence && patterns.typicalSequence.length > 0) {
      const sequenceContext = `
## Expected Validation Sequence:
The following checks typically validate in this order:
${patterns.typicalSequence.map((step) => `- ${step}`).join('\n')}

Ensure your implementation will pass all these checks in order.

---
`;
      refinedPrompt = sequenceContext + refinedPrompt;
    }

    return refinedPrompt;
  }

  /**
   * Hash a prompt for pattern storage
   */
  private hashPrompt(prompt: string): string {
    return crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16);
  }

  /**
   * Aggregate patterns from raw executions
   * Called by background service to consolidate data
   */
  async aggregatePatterns(
    agentRole: string,
    intent: string,
    minExecutions: number = 10
  ): Promise<ExecutionPattern | null> {
    if (!this.supabase) {
      console.warn('[AgentTrainer] Cannot aggregate patterns: Supabase not configured');
      return null;
    }

    try {
      // Query execution history for this agent/intent
      const { data: executions, error: execError } = await this.supabase
        .from('validation_metrics')
        .select('*')
        .eq('agent_role', agentRole)
        .eq('intent', intent)
        .order('created_at', { ascending: false })
        .limit(100); // Get last 100 to analyze

      if (execError) {
        console.error('[AgentTrainer] Failed to query executions:', execError);
        return null;
      }

      if (!executions || executions.length < minExecutions) {
        console.log(
          `[AgentTrainer] Not enough executions (${executions?.length || 0} < ${minExecutions}) for pattern aggregation`
        );
        return null;
      }

      // Calculate statistics
      const successCount = executions.filter((e) => e.action === 'commit').length;
      const successRate = successCount / executions.length;
      const avgIterations = Math.round(
        executions.reduce((sum, e) => sum + (e.iteration_count || 1), 0) / executions.length
      );

      // Extract common errors
      const errorMap = new Map<string, number>();
      executions.forEach((e) => {
        if (e.failed_checks && Array.isArray(e.failed_checks)) {
          e.failed_checks.forEach((check: string) => {
            errorMap.set(check, (errorMap.get(check) || 0) + 1);
          });
        }
      });

      const commonErrors = Array.from(errorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([error]) => error);

      // Infer typical sequence from successful runs
      const successfulRuns = executions.filter((e) => e.action === 'commit');
      const typicalSequence =
        successfulRuns.length > 0 ? this.inferSequence(successfulRuns) : DEFAULT_VALIDATION_CHECKS;

      // Upsert pattern record
      const pattern: ExecutionPattern = {
        agentRole,
        intent,
        promptPattern: '', // Can be enhanced later
        successRate,
        avgIterations,
        totalExecutions: executions.length,
        commonErrors,
        typicalSequence,
      };

      const { error: upsertError } = await this.supabase.from('agent_execution_patterns').upsert(
        [
          {
            agent_role: agentRole,
            intent,
            success_rate: successRate,
            avg_iterations: avgIterations,
            total_executions: executions.length,
            common_errors: commonErrors,
            typical_sequence: typicalSequence,
            last_updated: new Date().toISOString(),
          },
        ],
        {
          onConflict: 'agent_role,intent',
        }
      );

      if (upsertError) {
        console.error('[AgentTrainer] Failed to upsert pattern:', upsertError);
        return null;
      }

      console.log(
        `[AgentTrainer] ✅ Aggregated pattern for ${agentRole}/${intent}: ${Math.round(successRate * 100)}% success rate`
      );
      return pattern;
    } catch (err) {
      console.error('[AgentTrainer] Exception aggregating patterns:', err);
      return null;
    }
  }

  /**
   * Infer typical sequence from successful executions
   */
  private inferSequence(successfulRuns: any[]): string[] {
    const sequences: string[][] = [];

    successfulRuns.forEach((run) => {
      // If we have failed_checks, the successful sequence avoided those
      if (run.failed_checks && Array.isArray(run.failed_checks)) {
        // Typical sequence is checks that didn't fail
        const allChecks = ['type-check', 'test', 'build'];
        const sequence = allChecks.filter((check) => !run.failed_checks.includes(check));
        if (sequence.length > 0) {
          sequences.push(sequence);
        }
      }
    });

    // Return most common sequence
    if (sequences.length === 0) {
      return ['type-check', 'test', 'build'];
    }

    // Find most frequent sequence
    return sequences[0];
  }

  /**
   * Get memory usage stats
   */
  getMemoryStats(): {
    executionsInMemory: number;
    decisionsInMemory: number;
  } {
    return {
      executionsInMemory: this.executionHistory.size,
      decisionsInMemory: this.decisionHistory.size,
    };
  }

  /**
   * Clear old memory to prevent leaks (call periodically)
   */
  clearOldMemory(maxAge: number = 3600000): void {
    const cutoff = Date.now() - maxAge;

    // Clear old executions
    for (const [key, record] of this.executionHistory.entries()) {
      if (new Date(record.timestamp).getTime() < cutoff) {
        this.executionHistory.delete(key);
      }
    }

    // Clear old decisions
    for (const [key, record] of this.decisionHistory.entries()) {
      if (new Date(record.timestamp).getTime() < cutoff) {
        this.decisionHistory.delete(key);
      }
    }
  }
}

// Singleton instance
let instance: AgentTrainer | null = null;

export function getAgentTrainer(): AgentTrainer {
  if (!instance) {
    instance = new AgentTrainer();
  }
  return instance;
}
