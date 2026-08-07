/**
 * Multi-Agent Orchestrator Dispatch API
 * POST /api/multi-agent/dispatch
 *
 * Dispatches tasks to agents for execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { MultiAgentOrchestrator } from '@intcloudsysops/multi-agent-orchestrator';
import { TaskDispatcher } from '@intcloudsysops/multi-agent-orchestrator';
import type { DispatchRequest, Task } from '@intcloudsysops/multi-agent-orchestrator/types';
import { z } from 'zod';

// Initialize dispatcher (in production, use singleton)
const orchestrator = new MultiAgentOrchestrator({
  maxConcurrentTasks: 10,
  enableTokenOptimization: true,
  logLevel: 'info',
});

const dispatcher = new TaskDispatcher({
  queueName: 'peskids-tasks',
  logLevel: 'info',
});

// Validation schema
const DispatchRequestSchema = z.object({
  source: z.enum(['chat', 'cli', 'webhook', 'api', 'dashboard']),
  taskIds: z.array(z.string()),
  preferredAgents: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validated = DispatchRequestSchema.parse(body);

    // In production, you would fetch actual tasks from database
    // For now, create placeholder tasks from IDs
    const tasks: Task[] = validated.taskIds.map(id => ({
      id,
      taskType: 'code_edit',
      title: `Task ${id}`,
      description: `Task dispatched from ${validated.source}`,
      files_to_edit: [],
      priority: 'medium',
      metadata: {
        source: validated.source,
        ...validated.metadata,
      },
    }));

    // Dispatch tasks
    const dispatchResponse = await dispatcher.dispatchFromAPI({
      source: validated.source,
      taskIds: validated.taskIds,
      preferredAgents: validated.preferredAgents,
      metadata: validated.metadata,
    });

    // Execute tasks in orchestrator
    const executionPromises = tasks.map(task =>
      orchestrator.dispatchTask(task).catch(err => ({
        taskId: task.id,
        error: err.message,
      }))
    );

    await Promise.all(executionPromises);

    return NextResponse.json({
      success: true,
      dispatchId: dispatchResponse.dispatchId,
      taskIds: dispatchResponse.taskIds,
      estimatedCompletionTime: dispatchResponse.estimatedCompletionTime,
      estimatedCost: dispatchResponse.estimatedCost,
      estimatedTokens: dispatchResponse.estimatedTokens,
      message: dispatchResponse.message,
    });
  } catch (error) {
    console.error('[MultiAgent] Dispatch API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
