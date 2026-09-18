import { requireAdminAccess } from '../../../../../lib/auth';
import { syncHealthTravelCatalog } from '../../../../../lib/revenue/health-travel-catalog-sync';

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;

  try {
    const result = await syncHealthTravelCatalog();
    return Response.json({ ok: true, ...result });
  } catch {
    // Fail closed without returning upstream/DB/provider details to the caller.
    return Response.json(
      {
        ok: false,
        error: 'Health Travel catalog sync failed',
      },
      { status: 502 }
    );
  }
}
