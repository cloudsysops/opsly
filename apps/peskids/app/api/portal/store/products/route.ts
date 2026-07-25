import { listStoreProducts } from '@/lib/services/store.service';
import { resolveTrustedPortalSession } from '@intcloudsysops/security';
import { z } from 'zod';

const querySchema = z.object({
  category: z.string().optional(),
  active: z.string().optional().transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

export async function GET(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    await resolveTrustedPortalSession(req);

    const searchParams = new URL(req.url).searchParams;
    const { category, active } = querySchema.parse({
      category: searchParams.get('category'),
      active: searchParams.get('active'),
    });

    const products = await listStoreProducts({
      category,
      active: active !== undefined ? active : true,
    });

    return Response.json(
      {
        ok: true,
        data: {
          products: products.map((p) => ({
            id: p.id,
            category: p.category,
            title: p.title,
            description: p.description,
            priceCents: p.price_cents,
            imageUrl: p.image_url,
            inventoryCount: p.inventory_count,
            active: p.active,
          })),
        },
      },
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to list store products:', error);
    return Response.json(
      { ok: false, error: 'Failed to list products', request_id: requestId },
      { status: 500 }
    );
  }
}
