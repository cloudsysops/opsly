import { promises as fsp } from 'fs';
import * as path from 'path';
import { IterationManager } from './iteration-manager.js';
import { AgentTrainer, type PatternSuggestion, type ExecutionPattern } from './agent-trainer.js';

export interface IterationSession {
  jobId: string;
  goal: string;
  maxIterations: number;
  currentIteration: number;
  status: 'active' | 'completed' | 'failed';
  history: IterationEntry[];
  startTime: string;
  endTime?: string;
  finalResult?: string;
}

export interface IterationEntry {
  iteration: number;
  prompt: string;
  result: string;
  validationStatus: 'passed' | 'failed';
  duration: number;
  timestamp: string;
}

/**
 * IterationOrchestrator: Manages autonomous iteration sessions
 * Coordinates with AgentTrainer to improve prompts across iterations
 */
export class IterationOrchestrator {
  private iterationManager: IterationManager;
  private agentTrainer: AgentTrainer;
  private cursorDir: string;
  private sessions: Map<string, IterationSession> = new Map();

  constructor(cursorDir: string = '.cursor') {
    this.cursorDir = cursorDir;
    this.iterationManager = new IterationManager(cursorDir);
    this.agentTrainer = new AgentTrainer();
  }

  /**
   * Start a new iteration session
   */
  async startIterationSession(
    jobId: string,
    maxIterations: number = 5,
    goal: string = '',
  ): Promise<IterationSession> {
    const session: IterationSession = {
      jobId,
      goal,
      maxIterations,
      currentIteration: 0,
      status: 'active',
      history: [],
      startTime: new Date().toISOString(),
    };

    this.sessions.set(jobId, session);
    console.log(
      `[IterationOrchestrator] 🚀 Started iteration session for job ${jobId} (max ${maxIterations} iterations)`,
    );

    return session;
  }

  /**
   * Suggest and enqueue the next iteration prompt
   * Uses trainer patterns to improve successive iterations
   */
  async suggestNextIteration(
    jobId: string,
    lastResult: string,
    agentRole: string = 'executor',
    intent: string = 'execute_code',
  ): Promise<{ nextPrompt: string; confidence: number }> {
    const session = this.sessions.get(jobId);

    if (!session) {
      throw new Error(`[IterationOrchestrator] Session not found: ${jobId}`);
    }

    if (session.currentIteration >= session.maxIterations) {
      throw new Error(
        `[IterationOrchestrator] Max iterations (${session.maxIterations}) reached`,
      );
    }

    // Get last prompt from history
    const lastPrompt =
      session.history.length > 0
        ? session.history[session.history.length - 1].prompt
        : session.goal;

    // Query patterns from trainer
    const patterns = await this.agentTrainer.getPatterns(agentRole, intent);

    // Get suggestion with patterns
    const suggestion = await this.agentTrainer.suggestNextPrompt(
      lastPrompt,
      lastResult,
      patterns,
    );

    console.log(
      `[IterationOrchestrator] 💡 Suggested iteration ${session.currentIteration + 1} (confidence: ${Math.round(suggestion.confidence * 100)}%)`,
    );

    return {
      nextPrompt: suggestion.nextPrompt,
      confidence: suggestion.confidence,
    };
  }

  /**
   * Enqueue the next prompt for execution by worker
   * Writes to .cursor/prompts/ directory
   */
  async enqueueNextPrompt(
    jobId: string,
    nextPrompt: string,
    iterationNumber: number,
  ): Promise<string> {
    const session = this.sessions.get(jobId);

    if (!session) {
      throw new Error(`[IterationOrchestrator] Session not found: ${jobId}`);
    }

    const promptsDir = path.join(this.cursorDir, 'prompts');

    try {
      // Ensure directory exists
      await fsp.mkdir(promptsDir, { recursive: true });

      // Write iteration prompt with metadata
      const filename = `iteration-${jobId}-${iterationNumber}.md`;
      const filepath = path.join(promptsDir, filename);

      const content = this.formatIterationPrompt(nextPrompt, iterationNumber, session.maxIterations);

      await fsp.writeFile(filepath, content, 'utf-8');

      console.log(
        `[IterationOrchestrator] ✅ Enqueued iteration ${iterationNumber}: ${filepath}`,
      );

      return filepath;
    } catch (err) {
      console.error(`[IterationOrchestrator] ❌ Failed to enqueue prompt:`, err);
      throw err;
    }
  }

  /**
   * Complete an iteration session with final result
   */
  async completeSession(
    jobId: string,
    finalResult: string,
    iterationHistory?: IterationEntry[],
  ): Promise<IterationSession> {
    const session = this.sessions.get(jobId);

    if (!session) {
      throw new Error(`[IterationOrchestrator] Session not found: ${jobId}`);
    }

    // Update session
    session.status = 'completed';
    session.endTime = new Date().toISOString();
    session.finalResult = finalResult;
    if (iterationHistory) {
      session.history = iterationHistory;
    }

    // Persist session to file
    await this.persistSession(session);

    const duration = new Date(session.endTime!).getTime() - new Date(session.startTime).getTime();

    console.log(
      `[IterationOrchestrator] ✅ Completed session for job ${jobId} in ${session.history.length} iterations (${Math.round(duration / 1000)}s)`,
    );

    return session;
  }

  /**
   * Record iteration entry to session
   */
  recordIterationEntry(
    jobId: string,
    iteration: number,
    prompt: string,
    result: string,
    validationStatus: 'passed' | 'failed',
    duration: number,
  ): void {
    const session = this.sessions.get(jobId);

    if (!session) {
      console.warn(`[IterationOrchestrator] Session not found: ${jobId}`);
      return;
    }

    const entry: IterationEntry = {
      iteration,
      prompt,
      result,
      validationStatus,
      duration,
      timestamp: new Date().toISOString(),
    };

    session.history.push(entry);
    session.currentIteration = iteration;

    console.log(
      `[IterationOrchestrator] 📝 Recorded iteration ${iteration}: ${validationStatus}`,
    );
  }

  /**
   * Format iteration prompt with metadata
   */
  private formatIterationPrompt(
    prompt: string,
    iterationNumber: number,
    maxIterations: number,
  ): string {
    const header = `---
agent_role: executor
iteration: ${iterationNumber}
max_iterations: ${maxIterations}
goal: "Autonomous iteration to improve code quality"
---

# Iteration ${iterationNumber}/${maxIterations}

This is an automatically generated iteration prompt based on previous validation results.

---

`;
    return header + prompt;
  }

  /**
   * Persist session to disk for recovery/audit
   */
  private async persistSession(session: IterationSession): Promise<void> {
    const sessionsDir = path.join(this.cursorDir, 'sessions');

    try {
      await fsp.mkdir(sessionsDir, { recursive: true });

      const filepath = path.join(sessionsDir, `session-${session.jobId}.json`);
      await fsp.writeFile(filepath, JSON.stringify(session, null, 2), 'utf-8');

      console.log(`[IterationOrchestrator] 💾 Persisted session: ${filepath}`);
    } catch (err) {
      console.error('[IterationOrchestrator] Failed to persist session:', err);
    }
  }

  /**
   * Load session from disk
   */
  async loadSession(jobId: string): Promise<IterationSession | null> {
    const filepath = path.join(this.cursorDir, 'sessions', `session-${jobId}.json`);

    try {
      const content = await fsp.readFile(filepath, 'utf-8');
      const session = JSON.parse(content) as IterationSession;

      this.sessions.set(jobId, session);
      console.log(`[IterationOrchestrator] 📂 Loaded session: ${jobId}`);

      return session;
    } catch (err) {
      console.log(`[IterationOrchestrator] No persisted session found: ${jobId}`);
      return null;
    }
  }

  /**
   * Get session status
   */
  getSession(jobId: string): IterationSession | null {
    return this.sessions.get(jobId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): IterationSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.status === 'active');
  }

  /**
   * Check if iteration improved (fewer validation failures)
   */
  didIterationImprove(jobId: string): boolean {
    const session = this.sessions.get(jobId);

    if (!session || session.history.length < 2) {
      return false;
    }

    const lastTwo = session.history.slice(-2);
    const previous = lastTwo[0];
    const current = lastTwo[1];

    // Improved if current passed when previous failed
    return previous.validationStatus === 'failed' && current.validationStatus === 'passed';
  }

  /**
   * Get iteration statistics
   */
  getIterationStats(jobId: string): {
    totalIterations: number;
    passedIterations: number;
    failedIterations: number;
    avgDuration: number;
    totalDuration: number;
  } | null {
    const session = this.sessions.get(jobId);

    if (!session) {
      return null;
    }

    const history = session.history;
    const passedIterations = history.filter((h) => h.validationStatus === 'passed').length;
    const failedIterations = history.filter((h) => h.validationStatus === 'failed').length;
    const totalDuration = history.reduce((sum, h) => sum + h.duration, 0);
    const avgDuration = history.length > 0 ? totalDuration / history.length : 0;

    return {
      totalIterations: history.length,
      passedIterations,
      failedIterations,
      avgDuration,
      totalDuration,
    };
  }

  /**
   * Clean up old sessions from memory
   */
  cleanupOldSessions(maxAge: number = 86400000): void {
    // 24 hours default
    const cutoff = Date.now() - maxAge;

    for (const [key, session] of this.sessions.entries()) {
      if (new Date(session.startTime).getTime() < cutoff) {
        this.sessions.delete(key);
      }
    }

    console.log('[IterationOrchestrator] 🧹 Cleaned up old sessions from memory');
  }
}

// Singleton instance
let instance: IterationOrchestrator | null = null;

export function getIterationOrchestrator(cursorDir?: string): IterationOrchestrator {
  if (!instance) {
    instance = new IterationOrchestrator(cursorDir);
  }
  return instance;
}
