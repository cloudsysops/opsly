import { requireAdminAccess } from '../../../../../lib/auth';
import { syncHealthTravelCatalog } from '../../../../../lib/revenue/health-travel-catalog-sync';

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;

  try {
    const result = await syncHealthTravelCatalog('health-travel-colombia');
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: 'Health Travel catalog sync failed',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }
}
