import { requireAdminAccessUnlessDemoRead } from '../../../../../lib/auth';
import { listApplicationsSafe } from '../../../../../lib/local-automation/discovery';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }
  return Response.json(await listApplicationsSafe());
}
