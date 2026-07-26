import { getStudentPoints, getPointsHistory, PointTransaction } from '@/lib/services/points.service';
import { adminAuth } from '@/lib/security-compat';
import { z } from 'zod';

const querySchema = z.object({
  historyLimit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 50)),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    await adminAuth(req);

    const searchParams = new URL(req.url).searchParams;
    const { historyLimit } = querySchema.parse({
      historyLimit: searchParams.get('historyLimit'),
    });

    const [points, history] = await Promise.all([
      getStudentPoints(params.id),
      getPointsHistory(params.id, historyLimit),
    ]);

    if (!points) {
      return Response.json(
        { ok: false, error: 'Student not found', request_id: requestId },
        { status: 404 }
      );
    }

    return Response.json(
      {
        ok: true,
        data: {
          studentId: points.student_id,
          currentBalance: points.current_balance,
          totalEarned: points.total_earned,
          totalRedeemed: points.total_redeemed,
          createdAt: points.created_at,
          updatedAt: points.updated_at,
          history: history.map((tx: PointTransaction) => ({
            id: tx.id,
            type: tx.transaction_type,
            points: tx.points_amount,
            description: tx.description,
            relatedOrderId: tx.related_order_id,
            relatedSubscriptionId: tx.related_subscription_id,
            relatedPaymentId: tx.related_payment_id,
            createdAt: tx.created_at,
          })),
        },
      },
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to fetch student points:', error);
    return Response.json(
      { ok: false, error: 'Failed to fetch student points', request_id: requestId },
      { status: 500 }
    );
  }
}
