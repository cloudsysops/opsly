import type { NextRequest } from 'next/server';
import { handleFeedbackApprove } from '../../../../lib/feedback/approve-service';

export async function POST(req: NextRequest): Promise<Response> {
  return handleFeedbackApprove(req);
}
