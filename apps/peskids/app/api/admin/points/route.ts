import { getAllStudentPoints } from '@/lib/services/points.service';
import { adminAuth } from '@/lib/security-compat';
import { z } from 'zod';

const querySchema = z.object({
  minPoints: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  maxPoints: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  offset: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 0)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 50)),
});

export async function GET(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    await adminAuth(req);

    const searchParams = new URL(req.url).searchParams;
    const query = querySchema.parse({
      minPoints: searchParams.get('minPoints'),
      maxPoints: searchParams.get('maxPoints'),
      offset: searchParams.get('offset'),
      limit: searchParams.get('limit'),
    });

    const result = await getAllStudentPoints({
      minPoints: query.minPoints,
      maxPoints: query.maxPoints,
      offset: query.offset,
      limit: Math.min(query.limit, 100), // Cap at 100
    });

    return Response.json(
      {
        ok: true,
        data: {
          students: result.students.map((s) => ({
            studentId: s.student_id,
            currentBalance: s.current_balance,
            totalEarned: s.total_earned,
            totalRedeemed: s.total_redeemed,
            updatedAt: s.updated_at,
          })),
          pagination: {
            total: result.total,
            offset: query.offset,
            limit: query.limit,
          },
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
