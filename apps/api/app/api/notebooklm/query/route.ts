import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminAccess } from '../../../../lib/auth';
import { HTTP_STATUS } from '../../../../lib/constants';
import { queryNotebookLmForApi } from '../../../../lib/notebooklm-query';

export const dynamic = 'force-dynamic';
const NOTEBOOKLM_QUESTION_MAX_LENGTH = 8_000;
const NOTEBOOKLM_CONTEXT_MAX_LENGTH = 16_000;

const bodySchema = z.object({
  question: z.string().min(1).max(NOTEBOOKLM_QUESTION_MAX_LENGTH),
  context: z.string().max(NOTEBOOKLM_CONTEXT_MAX_LENGTH).optional(),
});

/**
 * POST /api/notebooklm/query — consulta NotebookLM vía notebooklm-py (requiere Python + credenciales en el contenedor API).
 */
export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  const { question, context } = parsed.data;
  const out = await queryNotebookLmForApi(question, context);

  if (!out.answer) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'NotebookLM no disponible (NOTEBOOKLM_ENABLED, NOTEBOOKLM_NOTEBOOK_ID o cliente Python).',
        ...out,
      },
      { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
    );
  }

  return NextResponse.json({ ok: true, ...out });
}
