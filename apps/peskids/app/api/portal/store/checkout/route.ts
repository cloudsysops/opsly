import { processStoreCheckout } from '@/lib/services/store-checkout.service';
import { getCart, clearCart } from '@/lib/services/store.service';
import { resolveTrustedPortalSession } from '@intcloudsysops/security';
import { z } from 'zod';

const checkoutSchema = z.object({
  pointsToRedeem: z.number().int().min(0).optional(),
  stripePaymentIntentId: z.string().optional(),
  wompiTransactionId: z.string().optional(),
});

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
    const { pointsToRedeem, stripePaymentIntentId, wompiTransactionId } =
      checkoutSchema.parse(body);

    // Get cart items
    const cartItems = await getCart(session.studentId);

    if (cartItems.length === 0) {
      return Response.json(
        { ok: false, error: 'Cart is empty', request_id: requestId },
        { status: 400 }
      );
    }

    // Calculate total in cents
    const totalCents = cartItems.reduce((sum, item) => {
      return sum + item.product.price_cents * item.quantity;
    }, 0);

    // Process checkout
    const result = await processStoreCheckout({
      studentId: session.studentId,
      cartItems: cartItems.map((item) => ({
        productId: item.product_id,
        quantity: item.quantity,
        unitPriceCents: item.product.price_cents,
      })),
      totalCents,
      pointsToRedeem,
      stripePaymentIntentId,
      wompiTransactionId,
    });

    if (!result.success) {
      return Response.json(
        {
          ok: false,
          error: result.error || 'Checkout failed',
          request_id: requestId,
        },
        { status: 400 }
      );
    }

    // Clear cart after successful checkout
    await clearCart(session.studentId);

    return Response.json(
      {
        ok: true,
        data: {
          orderId: result.orderId,
          totalCents: result.totalCents,
          discountCents: result.discountCents,
          finalAmountCents: result.finalAmountCents,
          pointsEarned: result.pointsEarned,
          pointsRedeemed: result.pointsRedeemed,
          pointsDiscountCents: result.pointsDiscountCents,
        },
      },
      { status: 201, headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    console.error('Checkout failed:', error);

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
      { ok: false, error: 'Checkout failed', request_id: requestId },
      { status: 500 }
    );
  }
}
