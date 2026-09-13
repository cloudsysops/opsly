import { requireAdminAccess } from '../../../../../lib/auth';
import { getHealthTravelRuntimeSummary } from '../../../../../lib/revenue/health-travel-summary';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const rawDays = Number(url.searchParams.get('days') ?? '30');
  const windowDays = Number.isFinite(rawDays) ? rawDays : 30;

  try {
    const summary = await getHealthTravelRuntimeSummary({ windowDays });
    return Response.json(summary);
  } catch (error) {
    return Response.json(
      {
        error: 'Health Travel summary unavailable',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
