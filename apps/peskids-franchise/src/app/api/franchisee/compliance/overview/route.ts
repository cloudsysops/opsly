import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/franchisee/compliance/overview - Get comprehensive compliance overview
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    if (!prospect || prospect.pipelineStage !== 'SELECTED' || !prospect.franchiseeAccount) {
      return NextResponse.json({ error: 'Not a franchisee' }, { status: 403 });
    }

    const account = prospect.franchiseeAccount;

    // Get all certifications
    const certifications = await db.certification.findMany({
      orderBy: [
        { requiredForLaunch: 'desc' },
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Get latest health score
    const latestHealthScore = await db.healthScore.findFirst({
      where: { franchiseeAccountId: account.id },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate compliance metrics
    const requiredCerts = certifications.filter((c) => c.requiredForLaunch);
    const earnedCertsActive = account.certifications.filter(
      (fc) => fc.status === 'ACTIVE' || fc.status === 'EXPIRING_SOON'
    );
    const earnedCertIds = new Set(earnedCertsActive.map((fc) => fc.certificationId));
    const expiringSoon = account.certifications.filter((fc) => fc.status === 'EXPIRING_SOON');
    const expired = account.certifications.filter((fc) => fc.status === 'EXPIRED');

    const requiredComplete = requiredCerts.filter((c) => earnedCertIds.has(c.id)).length;
    const requiredTotal = requiredCerts.length;
    const overallCompletion = requiredTotal > 0
      ? Math.round((requiredComplete / requiredTotal) * 100)
      : 100;

    // Group certifications by category
    const byCategory = certifications.reduce((acc, cert) => {
      if (!acc[cert.category]) {
        acc[cert.category] = {
          name: cert.category,
          certifications: [],
          completed: 0,
          total: 0,
          required: 0,
          requiredComplete: 0,
        };
      }
      acc[cert.category].certifications.push(cert);
      acc[cert.category].total++;
      if (earnedCertIds.has(cert.id)) {
        acc[cert.category].completed++;
      }
      if (cert.requiredForLaunch) {
        acc[cert.category].required++;
        if (earnedCertIds.has(cert.id)) {
          acc[cert.category].requiredComplete++;
        }
      }
      return acc;
    }, {} as Record<string, { name: string; certifications: typeof certifications; completed: number; total: number; required: number; requiredComplete: number }>);

    // Build detailed certification list with status
    const certificationDetails = certifications.map((cert) => {
      const earned = account.certifications.find((fc) => fc.certificationId === cert.id);
      return {
        id: cert.id,
        slug: cert.slug,
        name: cert.name,
        description: cert.description,
        category: cert.category,
        requiredForLaunch: cert.requiredForLaunch,
        renewalMonths: cert.renewalMonths,
        earned: earned ? {
          id: earned.id,
          earnedAt: earned.earnedAt.toISOString(),
          expiresAt: earned.expiresAt?.toISOString() || null,
          status: earned.status,
          documentUrl: earned.documentUrl,
        } : null,
        status: earned?.status || 'NOT_STARTED',
      };
    });

    // Calculate days until next expiration
    const nextExpiration = expiringSoon
      .filter((fc) => fc.expiresAt)
      .sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime())[0];

    const daysUntilNextExpiration = nextExpiration?.expiresAt
      ? Math.ceil((new Date(nextExpiration.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    // Get compliance score from health score
    const complianceComponent = latestHealthScore?.complianceScore || null;

    return NextResponse.json({
      summary: {
        overallCompletion,
        requiredComplete,
        requiredTotal,
        totalCertifications: certifications.length,
        earnedCertifications: earnedCertsActive.length,
        expiringSoon: expiringSoon.length,
        expired: expired.length,
        daysUntilNextExpiration,
        complianceScore: complianceComponent || overallCompletion,
      },
      categories: Object.values(byCategory).map((cat) => ({
        name: cat.name,
        completed: cat.completed,
        total: cat.total,
        required: cat.required,
        requiredComplete: cat.requiredComplete,
        progress: cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 100,
      })),
      certifications: certificationDetails,
      expiring: expiringSoon.map((fc) => ({
        id: fc.id,
        name: fc.certification.name,
        expiresAt: fc.expiresAt?.toISOString(),
        daysUntil: fc.expiresAt
          ? Math.ceil((new Date(fc.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      })),
      expired: expired.map((fc) => ({
        id: fc.id,
        name: fc.certification.name,
        expiredAt: fc.expiresAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching compliance overview:', error);
    return NextResponse.json({ error: 'Failed to fetch compliance data' }, { status: 500 });
  }
}
