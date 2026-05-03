import type { NextRequest } from 'next/server';
import { postShieldAlertConfig } from '../../../../../lib/shield-alert-post';

/**
 * POST /api/shield/alerts/config
 *
 * Zero-Trust: Bearer portal JWT; `tenant_slug` must match the session tenant.
 */
export function POST(request: NextRequest): Promise<Response> {
  return postShieldAlertConfig(request);
}
