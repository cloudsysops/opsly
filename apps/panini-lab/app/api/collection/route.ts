import { NextRequest } from 'next/server';
import { listCollectionItems } from '@/lib/collection';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  try {
    const items = await listCollectionItems();
    return successJson(requestId, {
      items,
      storage: process.env.SUPABASE_URL ? 'supabase' : 'memory',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load collection';
    return errorJson(requestId, message, 500);
  }
}
