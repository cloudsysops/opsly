/**
 * POST /api/orchestrator/dispatch-chat
 *
 * Dispatch desde lenguaje natural (ej. "Ejecuta PESKIDS-1.1 a PESKIDS-1.4").
 * Extrae referencias de tarea solo para trazabilidad y delega la ejecución
 * en processOrchestratorJob() vía dispatchFromChat() (lib/runtime).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dispatchFromChat } from '../../../../../../lib/runtime/task-dispatch';

const ChatDispatchRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  tenantId: z.string().optional(),
  budget: z.enum(['low', 'medium', 'high']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ChatDispatchRequestSchema.parse(body);

    const outcome = await dispatchFromChat(validated.message, {
      tenantId: validated.tenantId,
      budget: validated.budget,
    });

    return NextResponse.json({ success: true, ...outcome });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[orchestrator] dispatch-chat error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
