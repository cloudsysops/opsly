import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/franchisee/agreement - Get franchisee's agreement details
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
            markets: true,
            franchiseAgreement: {
              include: {
                renewals: {
                  orderBy: { renewalNumber: 'desc' },
                },
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
    const agreement = account.franchiseAgreement;

    if (!agreement) {
      return NextResponse.json({
        hasAgreement: false,
        message: 'No franchise agreement found. Please contact franchising@acmefranchise.com.',
      });
    }

    // Calculate days until expiry
    const today = new Date();
    const endDate = new Date(agreement.endDate);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate years remaining
    const yearsRemaining = Math.max(0, daysUntilExpiry / 365);

    // Get active/pending renewal
    const activeRenewal = agreement.renewals.find(
      (r: { status: string }) => !['COMPLETED', 'TERMINATED', 'TRANSFERRED', 'NON_RENEWAL', 'DECLINED'].includes(r.status)
    );

    // Calculate renewal timeline
    const renewalNoticeDeadline = new Date(endDate);
    renewalNoticeDeadline.setMonth(renewalNoticeDeadline.getMonth() - agreement.renewalNoticeMonths);

    const nonRenewalNoticeDeadline = new Date(endDate);
    nonRenewalNoticeDeadline.setMonth(nonRenewalNoticeDeadline.getMonth() - agreement.nonRenewalNoticeMonths);

    // Build renewal history with status labels
    const renewalHistory = agreement.renewals.map((r: any) => ({
      id: r.id,
      renewalNumber: r.renewalNumber,
      initiatedAt: r.initiatedAt.toISOString(),
      status: r.status,
      effectiveDate: r.effectiveDate?.toISOString() || null,
      newTermYears: r.newTermYears,
      newEndDate: r.newEndDate?.toISOString() || null,
      franchiseeIntent: r.franchiseeIntent,
      franchiseeIntentAt: r.franchiseeIntentAt?.toISOString() || null,
      signedAt: r.signedAt?.toISOString() || null,
    }));

    // Format territory info
    const territories = account.markets.map((m: any) => ({
      id: m.id,
      name: m.name,
      state: m.state,
      city: m.city,
      zipCodes: m.zipCodes,
      counties: m.counties,
      schoolDistricts: m.schoolDistricts,
    }));

    return NextResponse.json({
      hasAgreement: true,
      agreement: {
        id: agreement.id,
        agreementNumber: agreement.agreementNumber,
        version: agreement.version,
        status: agreement.status,
        startDate: agreement.startDate.toISOString(),
        endDate: agreement.endDate.toISOString(),
        termYears: agreement.termYears,
        territoryDescription: agreement.territoryDescription,
        exclusiveTerritory: agreement.exclusiveTerritory,
        // Financial terms
        initialFranchiseFee: Number(agreement.initialFranchiseFee),
        royaltyPercent: Number(agreement.royaltyPercent),
        brandFundPercent: Number(agreement.brandFundPercent),
        systemsFeePercent: Number(agreement.systemsFeePercent),
        totalOngoingFees: Number(agreement.royaltyPercent) + Number(agreement.brandFundPercent) + Number(agreement.systemsFeePercent),
        // Renewal terms
        renewalTermYears: agreement.renewalTermYears,
        renewalFee: agreement.renewalFee ? Number(agreement.renewalFee) : null,
        renewalNoticeMonths: agreement.renewalNoticeMonths,
        nonRenewalNoticeMonths: agreement.nonRenewalNoticeMonths,
        // Signing info
        signedAt: agreement.signedAt?.toISOString() || null,
        signedBy: agreement.signedBy,
        documentUrl: agreement.documentUrl,
      },
      metrics: {
        daysUntilExpiry,
        yearsRemaining: Math.round(yearsRemaining * 10) / 10,
        isExpiringSoon: daysUntilExpiry <= 365,
        isExpired: daysUntilExpiry <= 0,
        renewalNoticeDeadline: renewalNoticeDeadline.toISOString(),
        nonRenewalNoticeDeadline: nonRenewalNoticeDeadline.toISOString(),
        daysUntilRenewalNotice: Math.ceil((renewalNoticeDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      },
      activeRenewal: activeRenewal ? {
        id: activeRenewal.id,
        renewalNumber: activeRenewal.renewalNumber,
        status: activeRenewal.status,
        initiatedAt: activeRenewal.initiatedAt.toISOString(),
        responseDeadline: activeRenewal.responseDeadline?.toISOString() || null,
        franchiseeIntent: activeRenewal.franchiseeIntent,
        franchiseeIntentAt: activeRenewal.franchiseeIntentAt?.toISOString() || null,
        franchisorDecision: activeRenewal.franchisorDecision,
      } : null,
      renewalHistory,
      territories,
    });
  } catch (error) {
    console.error('Error fetching agreement:', error);
    return NextResponse.json({ error: 'Failed to fetch agreement data' }, { status: 500 });
  }
}
