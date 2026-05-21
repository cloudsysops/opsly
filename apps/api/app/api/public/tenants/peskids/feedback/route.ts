import type { NextRequest } from 'next/server';
import { postPublicPeskidsFeedback } from '../../../../../../lib/peskids/public-feedback-post';

/**
 * POST /api/public/tenants/peskids/feedback
 * Public parent feedback (no JWT). Requires migration 0053 applied in Supabase.
 */
export async function POST(request: NextRequest): Promise<Response> {
  return postPublicPeskidsFeedback(request);
}
