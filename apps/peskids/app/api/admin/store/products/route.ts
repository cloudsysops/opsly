import { listStoreProducts, createProduct } from '@/lib/services/store.service';
import { adminAuth } from '@intcloudsysops/security';
import { z } from 'zod';

const createProductSchema = z.object({
  category: z.enum(['utilities', 'merchandise', 'services']),
  title: z.string().min(1),
  description: z.string().optional(),
  priceCents: z.number().int().min(1),
  imageUrl: z.string().url().optional(),
  inventoryCount: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

const querySchema = z.object({
  category: z.string().optional(),
  active: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

export async function GET(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    await adminAuth(req);

    const searchParams = new URL(req.url).searchParams;
    const { category, active } = querySchema.parse({
      category: searchParams.get('category'),
      active: searchParams.get('active'),
    });

    const products = await listStoreProducts({ category, active });

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
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          })),
        },
      },
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to list products:', error);
    return Response.json(
      { ok: false, error: 'Failed to list products', request_id: requestId },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    await adminAuth(req);

    const body = await req.json();
    const data = createProductSchema.parse(body);

    const product = await createProduct({
      category: data.category,
      title: data.title,
      description: data.description,
      price_cents: data.priceCents,
      image_url: data.imageUrl,
      inventory_count: data.inventoryCount,
      active: data.active,
    });

    return Response.json(
      {
        ok: true,
        data: {
          id: product.id,
          category: product.category,
          title: product.title,
          description: product.description,
          priceCents: product.price_cents,
          imageUrl: product.image_url,
          inventoryCount: product.inventory_count,
          active: product.active,
          createdAt: product.created_at,
        },
      },
      { status: 201, headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to create product:', error);

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          ok: false,
          error: 'Invalid request',
          details: error.errors,
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    return Response.json(
      { ok: false, error: 'Failed to create product', request_id: requestId },
      { status: 500 }
    );
  }
}
