import { NextResponse } from 'next/server';
import { applyPlayAction, viewFromSave } from '@intcloudsysops/game-web';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PlayRequestBody {
  save?: unknown;
  action?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as PlayRequestBody;
    const action = body.action ?? { type: 'hydrate' };
    const result =
      action && typeof action === 'object' && 'type' in action && action.type === 'hydrate'
        ? viewFromSave(body.save)
        : applyPlayAction(body.save, action);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Play action failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
