import { NextRequest, NextResponse } from 'next/server';
import { storeDraftReply } from '@/lib/message-store';

function internalSecret(): string | undefined {
  return (
    process.env.PESKIDS_INTERNAL_SECRET ||
    process.env.PESKIDS_INBOUND_WEBHOOK_SECRET ||
    process.env.JELOU_WEBHOOK_SECRET
  );
}

function verifyInternal(req: NextRequest): boolean {
  const secret = internalSecret();
  if (!secret) return false;
  const header = req.headers.get('x-internal-secret') || req.headers.get('x-webhook-secret') || '';
  return header === secret;
}

export async function POST(req: NextRequest) {
  if (!verifyInternal(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as {
    parent_message_id?: string;
    draft_text?: string;
    source?: 'whatsapp' | 'instagram' | 'web';
  };

  const parentId = body.parent_message_id?.trim();
  const draftText = body.draft_text?.trim();
  const source = body.source ?? 'whatsapp';

  if (!parentId || !draftText) {
    return NextResponse.json(
      { error: 'parent_message_id and draft_text required' },
      { status: 400 }
    );
  }

  const { draft, error } = await storeDraftReply(parentId, draftText, source);
  if (error || !draft) {
    return NextResponse.json({ error: error ?? 'Failed to store draft' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, draft }, { status: 201 });
}
