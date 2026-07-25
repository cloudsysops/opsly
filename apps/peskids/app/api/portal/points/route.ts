import { getStudentPoints, getPointsHistory } from '@/lib/services/points.service';
import { resolveTrustedPortalSession } from '@intcloudsysops/security';

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

    const searchParams = new URL(req.url).searchParams;
    const historyLimit = parseInt(searchParams.get('limit') || '50', 10);

    const [points, history] = await Promise.all([
      getStudentPoints(session.studentId),
      getPointsHistory(session.studentId, historyLimit),
    ]);

    return Response.json(
      {
        ok: true,
        data: {
          currentBalance: points?.current_balance || 0,
          totalEarned: points?.total_earned || 0,
          totalRedeemed: points?.total_redeemed || 0,
          history: history.map((tx) => ({
            id: tx.id,
            type: tx.transaction_type,
            points: tx.points_amount,
            description: tx.description,
            createdAt: tx.created_at,
          })),
        },
      },
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to fetch points:', error);
    return Response.json(
      { ok: false, error: 'Failed to fetch points', request_id: requestId },
      { status: 500 }
    );
  }
}
