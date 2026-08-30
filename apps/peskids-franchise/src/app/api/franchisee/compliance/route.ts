import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = "force-dynamic";

// GET /api/franchisee/compliance - Get franchisee compliance data
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get prospect with franchisee account
    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: {
        franchiseeAccount: {
          include: {
            certifications: {
              include: {
                certification: true,
              },
            },
          },
        },
      },
    });

    if (!prospect || prospect.pipelineStage !== 'SELECTED') {
      return NextResponse.json(
        { error: 'Not a selected franchisee' },
        { status: 403 }
      );
    }

    const account = prospect.franchiseeAccount;
    if (!account) {
      return NextResponse.json(
        { error: 'Franchisee account not found' },
        { status: 404 }
      );
    }

    // Get all certifications
    const certifications = await db.certification.findMany({
      orderBy: [
        { requiredForLaunch: 'desc' },
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Calculate completion stats
    const requiredCerts = certifications.filter((c) => c.requiredForLaunch);
    const earnedCertIds = new Set(
      account.certifications
        .filter((fc) => fc.status === 'ACTIVE' || fc.status === 'EXPIRING_SOON')
        .map((fc) => fc.certificationId)
    );

    const requiredComplete = requiredCerts.filter((c) => earnedCertIds.has(c.id)).length;
    const requiredTotal = requiredCerts.length;
    const completionRate = requiredTotal > 0
      ? Math.round((requiredComplete / requiredTotal) * 100)
      : 100;

    // Format earned certifications
    const earnedCertifications = account.certifications.map((fc) => ({
      id: fc.id,
      certificationId: fc.certificationId,
      certification: fc.certification,
      earnedAt: fc.earnedAt.toISOString(),
      expiresAt: fc.expiresAt?.toISOString() || null,
      status: fc.status,
      documentUrl: null, // Would come from document management system
    }));

    return NextResponse.json({
      certifications,
      earnedCertifications,
      completionRate,
      requiredComplete,
      requiredTotal,
    });
  } catch (error) {
    console.error('Error fetching franchisee compliance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance data' },
      { status: 500 }
    );
  }
}
