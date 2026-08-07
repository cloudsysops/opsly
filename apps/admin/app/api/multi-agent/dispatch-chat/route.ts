/**
 * Multi-Agent Orchestrator Chat Dispatch API
 * POST /api/multi-agent/dispatch-chat
 *
 * Parses natural language messages and dispatches tasks
 * Example: "Ejecuta PESKIDS-1.1 a PESKIDS-1.4"
 */

import { NextRequest, NextResponse } from 'next/server';
import { MultiAgentOrchestrator } from '@intcloudsysops/multi-agent-orchestrator';
import { TaskDispatcher } from '@intcloudsysops/multi-agent-orchestrator';
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
const ChatDispatchRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validated = ChatDispatchRequestSchema.parse(body);

    // Dispatch from chat message
    const dispatchResponse = await dispatcher.dispatchFromChat(validated.message);

    if (!dispatchResponse.success || dispatchResponse.taskIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: dispatchResponse.message || 'No valid tasks found in message',
        },
        { status: 400 }
      );
    }

    // Get cached tasks and execute
    const cachedTasks = dispatcher.getTasksByDispatchId(dispatchResponse.dispatchId);

    if (cachedTasks) {
      const executionPromises = cachedTasks.map(task =>
        orchestrator.dispatchTask(task).catch(err => ({
          taskId: task.id,
          error: err.message,
        }))
      );

      await Promise.all(executionPromises);
    }

    return NextResponse.json({
      success: true,
      dispatchId: dispatchResponse.dispatchId,
      taskIds: dispatchResponse.taskIds,
      estimatedCompletionTime: dispatchResponse.estimatedCompletionTime,
      estimatedCost: dispatchResponse.estimatedCost,
      estimatedTokens: dispatchResponse.estimatedTokens,
      message: dispatchResponse.message,
      parsed: {
        originalMessage: validated.message,
        tasksFound: dispatchResponse.taskIds.length,
      },
    });
  } catch (error) {
    console.error('[MultiAgent] Chat Dispatch API error:', error);

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
