import { promises as fsp } from 'fs';
import * as path from 'path';
import { AgentTrainer, type ExecutionRecord } from '../training/agent-trainer.js';
import { PromptSuggester, type SuggestionContext } from './prompt-suggester.js';

interface IterationState {
  job_id: string;
  task_goal: string;
  initial_prompt: string;
  current_iteration: number;
  max_iterations: number;
  agent_role: 'cursor' | 'claude' | 'copilot' | 'opencode';
  history: Array<{
    iteration: number;
    prompt: string;
    result: string;
    timestamp: string;
    duration_ms: number;
  }>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
}

export class IterationOrchestrator {
  private stateDir: string;
  private trainer: AgentTrainer;

  constructor(stateDir: string = '.cursor/iteration-state', trainerDir: string = '.cursor/training') {
    this.stateDir = stateDir;
    this.trainer = new AgentTrainer(trainerDir);
  }

  /**
   * Initialize a new iteration session
   */
  async initializeSession(
    jobId: string,
    taskGoal: string,
    initialPrompt: string,
    agentRole: 'cursor' | 'claude' | 'copilot' | 'opencode' = 'cursor',
    maxIterations: number = 5,
  ): Promise<IterationState> {
    const state: IterationState = {
      job_id: jobId,
      task_goal: taskGoal,
      initial_prompt: initialPrompt,
      current_iteration: 0,
      max_iterations: maxIterations,
      agent_role: agentRole,
      history: [],
      status: 'pending',
      started_at: new Date().toISOString(),
    };

    await this.saveState(state);
    return state;
  }

  /**
   * Record execution result and determine next action
   */
  async recordResult(
    jobId: string,
    result: string,
    durationMs: number,
  ): Promise<{
    should_iterate: boolean;
    next_prompt?: string;
    reasoning: string;
  }> {
    const state = await this.getState(jobId);
    if (!state) {
      return {
        should_iterate: false,
        reasoning: 'Session not found',
      };
    }

    // Record execution
    state.history.push({
      iteration: state.current_iteration,
      prompt: state.history.length === 0 ? state.initial_prompt : 'auto-generated',
      result,
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
    });

    state.current_iteration += 1;

    // Record for trainer
    const executionRecord: ExecutionRecord = {
      job_id: jobId,
      timestamp: new Date().toISOString(),
      agent_role: state.agent_role,
      prompt: state.history[state.history.length - 1].prompt,
      result,
      duration_ms: durationMs,
      success: !this.hasFailures(result),
      iterations: state.current_iteration,
      task_category: this.extractCategory(state.task_goal),
    };

    if (!executionRecord.success) {
      const error = this.extractError(result);
      executionRecord.error = error;
    }

    await this.trainer.recordExecution(executionRecord);

    // Decide next action
    if (state.current_iteration >= state.max_iterations) {
      state.status = 'completed';
      state.completed_at = new Date().toISOString();
      await this.saveState(state);

      return {
        should_iterate: false,
        reasoning: `Max iterations (${state.max_iterations}) reached`,
      };
    }

    // Get patterns for this task
    const patterns = await this.trainer.getPatternsFor(state.task_goal);

    // Generate next prompt
    const context: SuggestionContext = {
      last_prompt: state.history[state.history.length - 1].prompt,
      last_result: result,
      task_goal: state.task_goal,
      agent_role: state.agent_role,
      iteration: state.current_iteration,
    };

    const suggestion = PromptSuggester.suggest(context, patterns);

    // Check if we should continue
    const shouldContinue =
      state.current_iteration < state.max_iterations &&
      (suggestion.is_refinement || suggestion.confidence > 0.7);

    await this.saveState(state);

    return {
      should_iterate: shouldContinue,
      next_prompt: shouldContinue ? suggestion.next_prompt : undefined,
      reasoning: suggestion.reasoning,
    };
  }

  /**
   * Get current session state
   */
  async getState(jobId: string): Promise<IterationState | null> {
    try {
      const filePath = path.join(this.stateDir, `${jobId}.json`);
      const data = await fsp.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Get session history
   */
  async getHistory(jobId: string): Promise<IterationState['history'] | null> {
    const state = await this.getState(jobId);
    return state?.history ?? null;
  }

  /**
   * Mark session as completed
   */
  async completeSession(jobId: string): Promise<void> {
    const state = await this.getState(jobId);
    if (state) {
      state.status = 'completed';
      state.completed_at = new Date().toISOString();
      await this.saveState(state);
    }
  }

  /**
   * Get summary of a session
   */
  async getSummary(jobId: string): Promise<any> {
    const state = await this.getState(jobId);
    if (!state) return null;

    return {
      job_id: jobId,
      goal: state.task_goal,
      agent: state.agent_role,
      iterations: state.current_iteration,
      max_iterations: state.max_iterations,
      status: state.status,
      duration_ms: new Date(state.completed_at || new Date()).getTime() - new Date(state.started_at).getTime(),
      final_result: state.history[state.history.length - 1]?.result || null,
    };
  }

  private async saveState(state: IterationState): Promise<void> {
    await fsp.mkdir(this.stateDir, { recursive: true });
    const filePath = path.join(this.stateDir, `${state.job_id}.json`);
    await fsp.writeFile(filePath, JSON.stringify(state, null, 2));
  }

  private hasFailures(result: string): boolean {
    const failurePatterns = [
      /error:|failed|exception|undefined|cannot find|not defined|is not assignable|missing/i,
    ];
    return failurePatterns.some((pattern) => pattern.test(result));
  }

  private extractError(result: string): string {
    const match = result.match(/error:|exception:|failed:(.+?)(?:\n|$)/i);
    return match ? match[1].trim() : 'Unknown error';
  }

  private extractCategory(goal: string): string {
    if (goal.toLowerCase().includes('api')) return 'api';
    if (goal.toLowerCase().includes('test')) return 'testing';
    if (goal.toLowerCase().includes('ui') || goal.toLowerCase().includes('component')) return 'ui';
    if (goal.toLowerCase().includes('database') || goal.toLowerCase().includes('migration'))
      return 'database';
    return 'general';
  }
}
