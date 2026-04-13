import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminAccess } from "../../../../lib/auth";
import { queryNotebookLmForApi } from "../../../../lib/notebooklm-query";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  question: z.string().min(1).max(8000),
  context: z.string().max(16_000).optional(),
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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { question, context } = parsed.data;
  const out = await queryNotebookLmForApi(question, context);

  if (!out.answer) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "NotebookLM no disponible (NOTEBOOKLM_ENABLED, NOTEBOOKLM_NOTEBOOK_ID o cliente Python).",
        ...out,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, ...out });
}
