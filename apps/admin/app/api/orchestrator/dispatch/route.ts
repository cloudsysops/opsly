/**
 * POST /api/orchestrator/dispatch
 *
 * Adaptador delgado hacia processOrchestratorJob() (lib/runtime). No crea
 * un job en un sistema paralelo: delega en la selección de worker y
 * ejecución que ya existen en Local-First.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dispatchTask } from '../../../../../../lib/runtime/task-dispatch';

const DispatchRequestSchema = z.object({
  source: z.enum(['api', 'dashboard']),
  task: z.string().min(1).max(4000),
  tenantId: z.string().optional(),
  budget: z.enum(['low', 'medium', 'high']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = DispatchRequestSchema.parse(body);

    const outcome = await dispatchTask(validated);

    return NextResponse.json({ success: true, ...outcome });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[orchestrator] dispatch error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
