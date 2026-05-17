import { ORCHESTRATOR_INTERNAL_URL } from '../../../../lib/runtime-proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function adminToken(): string {
  return process.env.PLATFORM_ADMIN_TOKEN?.trim() ?? '';
}

export async function GET(): Promise<Response> {
  const token = adminToken();
  if (token.length === 0) {
    return Response.json(
      { error: 'Server misconfiguration: PLATFORM_ADMIN_TOKEN is not set' },
      { status: 500 },
    );
  }

  try {
    const upstream = await fetch(`${ORCHESTRATOR_INTERNAL_URL}/internal/runtime/stream`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      cache: 'no-store',
    });

    if (!upstream.ok || upstream.body === null) {
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `orchestrator unreachable: ${message}` }, { status: 503 });
  }
}
