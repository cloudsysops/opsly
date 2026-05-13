import { Worker } from 'bullmq';
import { localAgentQueue } from '../queue.js';
import { IterationOrchestrator } from '../lib/iteration/iteration-orchestrator.js';
import { AgentTrainer } from '../lib/training/agent-trainer.js';
import { enqueueLocalAgentJob } from '../queue.js';
import type { OrchestratorJob } from '../types.js';
import { logWorkerInfo, logWorkerError } from '../observability/worker-log.js';

interface LocalAgentJob extends OrchestratorJob {
  prompt_body?: string;
  max_iterations?: number;
  goal?: string;
  max_steps?: number;
}


interface AgentResponse {
  success: boolean;
  result?: string;
  error?: string;
  duration_ms: number;
}

/**
 * Unified Local Agent Worker
 *
 * Handles the complete lifecycle:
 * 1. Execute prompt via HTTP agent service
 * 2. Record result with IterationOrchestrator
 * 3. Auto-iterate if needed (via PromptSuggester)
 * 4. Train AgentTrainer on patterns
 * 5. Auto-commit when complete
 */
export class UnifiedLocalAgentWorker {
  private worker: Worker<LocalAgentJob>;
  private orchestrator: IterationOrchestrator;
  private trainer: AgentTrainer;

  constructor(
    cursorDir: string = '.cursor',
    agentServices: Record<string, string> = {
      cursor: 'http://localhost:5001',
      claude: 'http://localhost:5002',
      copilot: 'http://localhost:5003',
      opencode: 'http://localhost:5004',
    },
  ) {
    this.orchestrator = new IterationOrchestrator(`${cursorDir}/iteration-state`, `${cursorDir}/training`);
    this.trainer = new AgentTrainer(`${cursorDir}/training`);

    this.worker = new Worker('local-agents', this.processJob.bind(this), {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      concurrency: Number(process.env.LOCAL_AGENT_CONCURRENCY || '2'),
    });

    // Event handlers
    this.worker.on('completed', (job) => {
      logWorkerInfo('local-agents', 'Job completed', { jobId: job.id, job_type: job.name });
    });

    this.worker.on('failed', (job, err) => {
      logWorkerError('local-agents', 'Job failed', { jobId: job?.id, error: err.message, job_type: job?.name });
    });

    this.worker.on('error', (err) => {
      logWorkerError('local-agents', 'Worker error', { error: err.message });
    });

    // Store services for use in processJob
    this.agentServices = agentServices;
    this.cursorDir = cursorDir;
  }

  private agentServices: Record<string, string>;
  private cursorDir: string;

  /**
   * Main job processor
   */
  private async processJob(job: any): Promise<any> {
    const localJob = job.data as LocalAgentJob;
    const promptBody = (localJob as any).prompt_body || localJob.metadata?.prompt_body || '';
    const agentRole = ((localJob as any).agent_role || 'cursor') as 'cursor' | 'claude' | 'copilot' | 'opencode';
    const goal = ((localJob as any).goal || localJob.metadata?.goal || 'Unspecified goal') as string;

logWorkerInfo('local-agents', 'Processing local agent job', {
    jobId: job.id,
    agent_role: agentRole,
    has_iterations: Boolean(localJob.max_iterations),
  });

    // Step 1: Initialize iteration session if needed
    let sessionId = localJob.request_id || job.id;
    if (localJob.max_iterations && localJob.max_iterations > 0) {
      const session = await this.orchestrator.initializeSession(
        sessionId,
        goal,
        promptBody,
        agentRole,
        localJob.max_iterations,
      );
      sessionId = session.job_id;
      logWorkerInfo('local-agents', 'Iteration session initialized', { session_id: sessionId, max_iterations: localJob.max_iterations });
    }

    // Step 2: Execute prompt via HTTP agent service
    const startTime = Date.now();
    const response = await this.executeViaAgentService(localJob, promptBody, agentRole);
    const duration = Date.now() - startTime;

    if (!response.success) {
logWorkerError('local-agents', 'Agent service failed', {
      agent_role: agentRole,
      error: response.error,
    });
      throw new Error(`Agent service failed: ${response.error}`);
    }

    const result = response.result || '';
    logWorkerInfo('local-agents', 'Agent execution complete', { duration, result_length: result.length });

    // Step 3: Record result and determine if we should iterate
    let shouldIterate = false;
    let nextPrompt: string | undefined;

    if (localJob.max_iterations && localJob.max_iterations > 0) {
      const iteration = await this.orchestrator.recordResult(sessionId, result, duration);
      shouldIterate = iteration.should_iterate;
      nextPrompt = iteration.next_prompt;

logWorkerInfo('local-agents', 'Iteration analysis complete', {
      should_iterate: shouldIterate,
      reasoning: iteration.reasoning,
    });
    }

    // Step 4: Write result to responses folder
    await this.writeResponse(job.id, result);

    // Step 5: Train on this execution
    await this.trainer.recordExecution({
      job_id: job.id,
      timestamp: new Date().toISOString(),
      agent_role: agentRole,
      prompt: promptBody,
      result,
      duration_ms: duration,
      success: response.success,
      iterations: 1,
      task_category: this.extractCategory(goal),
    });

    // Step 6: Auto-iterate if needed
    if (shouldIterate && nextPrompt) {
      logWorkerInfo('local-agents', 'Auto-iterating', { session_id: sessionId });

      const nextJob: LocalAgentJob = {
        type: localJob.type || 'local_cursor',
        taskId: `${localJob.taskId || 'task'}-iter-${Date.now()}`,
        tenant_slug: localJob.tenant_slug,
        tenant_id: localJob.tenant_id,
        request_id: `${sessionId}-auto-iter`,
        initiated_by: 'system',
        agent_role: agentRole as any,
        max_iterations: 0,
        payload: localJob.payload || {},
        metadata: {
          ...localJob.metadata,
          prompt_body: nextPrompt,
          iteration_session: sessionId,
          parent_job_id: job.id,
        },
      };

      await enqueueLocalAgentJob(nextJob);
      logWorkerInfo('local-agents', 'Next iteration enqueued', { parent_job: job.id });
    } else if (!shouldIterate && localJob.max_iterations && localJob.max_iterations > 0) {
      // Session is complete
      await this.orchestrator.completeSession(sessionId);
      const summary = await this.orchestrator.getSummary(sessionId);
      logWorkerInfo('local-agents', 'Iteration session complete', { summary });

      // Generate patterns report
      const report = await this.trainer.generatePatterns();
logWorkerInfo('local-agents', 'Trainer report generated', {
      total_executions: report.total_executions,
      patterns_found: report.patterns.length,
    });
    }

    return {
      success: true,
      result_length: result.length,
      duration,
      iterations: localJob.max_iterations || 1,
      session_id: localJob.max_iterations ? sessionId : undefined,
    };
  }

  /**
   * Execute prompt via HTTP agent service
   */
  private async executeViaAgentService(
    job: LocalAgentJob,
    promptBody: string,
    agentRole: 'cursor' | 'claude' | 'copilot' | 'opencode',
  ): Promise<AgentResponse> {
    const serviceUrl = this.agentServices[agentRole];
    if (!serviceUrl) {
      return {
        success: false,
        error: `No service configured for agent: ${agentRole}`,
        duration_ms: 0,
      };
    }

    try {
      const response = await fetch(`${serviceUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptBody,
          job_id: job.request_id || job.taskId,
          max_steps: (job as any).max_steps || 10,
          timeout_ms: 300000, // 5 min timeout
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${error}`,
          duration_ms: 0,
        };
      }

      const data = await response.json();
      return {
        success: true,
        result: data.result || data.response || '',
        duration_ms: data.duration_ms || 0,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Service request failed: ${message}`,
        duration_ms: 0,
      };
    }
  }

  /**
   * Write response to .cursor/responses/
   */
  private async writeResponse(jobId: string, result: string): Promise<void> {
    const { promises: fsp } = await import('fs');
    const path = await import('path');

    const responsesDir = path.join(this.cursorDir, 'responses');
    await fsp.mkdir(responsesDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `response-${jobId}-${timestamp}.md`;
    const filepath = path.join(responsesDir, filename);

    await fsp.writeFile(filepath, result);
    logWorkerInfo('local-agents', 'Response written', { filepath });
  }

  /**
   * Extract task category from goal
   */
  private extractCategory(goal?: string): string {
    if (!goal) return 'general';
    const lower = goal.toLowerCase();
    if (lower.includes('api')) return 'api';
    if (lower.includes('test')) return 'testing';
    if (lower.includes('ui') || lower.includes('component')) return 'ui';
    if (lower.includes('database') || lower.includes('migration')) return 'database';
    return 'general';
  }

  /**
   * Start worker
   */
  async start(): Promise<void> {
    logWorkerInfo('local-agents', 'UnifiedLocalAgentWorker starting');
    await this.worker.waitUntilReady();
    logWorkerInfo('local-agents', 'UnifiedLocalAgentWorker ready');
  }

  /**
   * Stop worker
   */
  async stop(): Promise<void> {
    logWorkerInfo('local-agents', 'Stopping UnifiedLocalAgentWorker');
    await this.worker.close();
    logWorkerInfo('local-agents', 'UnifiedLocalAgentWorker stopped');
  }
}
