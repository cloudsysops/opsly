import { getProductById, updateProduct, deleteProduct } from '@/lib/services/store.service';
import { adminAuth } from '@/lib/security-compat';
import { z } from 'zod';

const updateProductSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priceCents: z.number().int().min(1).optional(),
  imageUrl: z.string().url().optional(),
  inventoryCount: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    await adminAuth(req);
    const { id } = await params;

    const product = await getProductById(id);

    if (!product) {
      return Response.json(
        { ok: false, error: 'Product not found', request_id: requestId },
        { status: 404 }
      );
    }

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
          updatedAt: product.updated_at,
        },
      },
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to get product:', error);
    return Response.json(
      { ok: false, error: 'Failed to get product', request_id: requestId },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    await adminAuth(req);
    const { id } = await params;

    const body = await req.json();
    const updates = updateProductSchema.parse(body);

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { ok: false, error: 'No fields to update', request_id: requestId },
        { status: 400 }
      );
    }

    const product = await updateProduct(id, {
      title: updates.title,
      description: updates.description,
      price_cents: updates.priceCents,
      image_url: updates.imageUrl,
      inventory_count: updates.inventoryCount,
      active: updates.active,
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
          updatedAt: product.updated_at,
        },
      },
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to update product:', error);

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
      { ok: false, error: 'Failed to update product', request_id: requestId },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    await adminAuth(req);
    const { id } = await params;

    await deleteProduct(id);

    return Response.json(
      { ok: true, data: { message: 'Product deleted' } },
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to delete product:', error);
    return Response.json(
      { ok: false, error: 'Failed to delete product', request_id: requestId },
      { status: 500 }
    );
  }
}
