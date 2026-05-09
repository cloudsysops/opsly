import { NextRequest, NextResponse } from 'next/server';
import { HTTP_STATUS } from '@/lib/constants';

/**
 * Stub endpoint for knowledge capture ingestion (Syra / RAG pipeline).
 * Extend with auth + persistence when the capture store is wired.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    if (body === null || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    if (process.env.SYRA_KNOWLEDGE_CAPTURE_DEBUG === 'true') {
      console.log('[knowledge/capture]', JSON.stringify(body).slice(0, 2000));
    }

    return NextResponse.json({ ok: true, received: true });
  } catch {
    return NextResponse.json({ error: 'Capture failed' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
}
