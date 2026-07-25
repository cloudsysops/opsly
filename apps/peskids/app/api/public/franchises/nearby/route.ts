import { z } from 'zod';
import { getNearbyFranchises } from '@/lib/services/franchise-management.service';

const querySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().int().min(1).max(500).default(50),
});

/**
 * GET /api/public/franchises/nearby
 * Find franchises near user's location
 * Query params: latitude, longitude, radiusKm (optional, default 50)
 *
 * Example:
 * GET /api/public/franchises/nearby?latitude=4.7110&longitude=-74.0721&radiusKm=20
 */
export async function GET(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const url = new URL(req.url);
    const params = querySchema.parse({
      latitude: url.searchParams.get('latitude'),
      longitude: url.searchParams.get('longitude'),
      radiusKm: url.searchParams.get('radiusKm'),
    });

    const result = await getNearbyFranchises(params);

    if (!result.success) {
      return Response.json(
        {
          ok: false,
          error: result.error,
          request_id: requestId,
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        ok: true,
        data: {
          franchises: (result.franchises || []).map((f) => ({
            id: f.id,
            name: f.name,
            city: f.city,
            country: f.country,
            phone: f.phone,
            tier: f.tier,
            distanceKm: f.distanceKm,
            latitude: f.latitude,
            longitude: f.longitude,
          })),
          searchRadius: params.radiusKm,
          userLocation: {
            latitude: params.latitude,
            longitude: params.longitude,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GET /api/public/franchises/nearby]', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          ok: false,
          error: 'Invalid location parameters',
          details: error.errors,
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        ok: false,
        error: 'Failed to find nearby franchises',
        request_id: requestId,
      },
      { status: 500 }
    );
  }
}
