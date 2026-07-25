import { getCart, addToCart, removeFromCart } from '@/lib/services/store.service';
import { resolveTrustedPortalSession } from '@intcloudsysops/security';
import { z } from 'zod';

const cartActionSchema = z.object({
  action: z.enum(['add', 'remove']),
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).optional(),
});

export async function GET(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const session = await resolveTrustedPortalSession(req);
    if (!session?.studentId) {
      return Response.json(
        { ok: false, error: 'Unauthorized', request_id: requestId },
        { status: 401 }
      );
    }

    const cartItems = await getCart(session.studentId);

    return Response.json(
      {
        ok: true,
        data: {
          items: cartItems.map((item) => ({
            id: item.id,
            productId: item.product_id,
            quantity: item.quantity,
            product: {
              id: item.product.id,
              title: item.product.title,
              category: item.product.category,
              priceCents: item.product.price_cents,
              imageUrl: item.product.image_url,
            },
            subtotalCents: item.product.price_cents * item.quantity,
          })),
          totalCents: cartItems.reduce(
            (sum, item) => sum + item.product.price_cents * item.quantity,
            0
          ),
        },
      },
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to get cart:', error);
    return Response.json(
      { ok: false, error: 'Failed to get cart', request_id: requestId },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const session = await resolveTrustedPortalSession(req);
    if (!session?.studentId) {
      return Response.json(
        { ok: false, error: 'Unauthorized', request_id: requestId },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, productId, quantity } = cartActionSchema.parse(body);

    if (action === 'add') {
      const result = await addToCart(session.studentId, productId, quantity || 1);
      return Response.json(
        {
          ok: true,
          data: {
            id: result.id,
            productId: result.product_id,
            quantity: result.quantity,
          },
        },
        { status: 201, headers: { 'content-type': 'application/json' } }
      );
    } else if (action === 'remove') {
      await removeFromCart(session.studentId, productId);
      return Response.json(
        { ok: true, data: { message: 'Product removed from cart' } },
        { headers: { 'content-type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Cart action failed:', error);

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
      { ok: false, error: 'Cart action failed', request_id: requestId },
      { status: 500 }
    );
  }
}
