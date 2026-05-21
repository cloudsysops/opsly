import type { NextRequest } from 'next/server';
import { postPublicPeskidsLead } from '../../../../../../lib/peskids/public-lead-post';

/**
 * POST /api/public/tenants/peskids/leads
 * Public lead capture (no JWT). Requires migration 0053 applied in Supabase.
 */
export async function POST(request: NextRequest): Promise<Response> {
  return postPublicPeskidsLead(request);
}
