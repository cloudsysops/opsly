import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  createConnectAccount,
  createConnectOnboardingLink,
  getConnectAccount,
  createExpressDashboardLink,
} from '@/lib/stripe';

export const dynamic = "force-dynamic";

// POST /api/admin/royalties/franchisee/[franchiseeId]/stripe - Create Stripe Connect account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ franchiseeId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { franchiseeId } = await params;

    // Get franchisee with prospect info
    const franchisee = await db.franchiseeAccount.findUnique({
      where: { id: franchiseeId },
      include: {
        prospect: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!franchisee) {
      return NextResponse.json({ error: 'Franchisee not found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://franchise-stc-993771038de6.herokuapp.com';

    // If they already have an account, just generate a new onboarding link
    if (franchisee.stripeAccountId) {
      // Check if already onboarded
      const account = await getConnectAccount(franchisee.stripeAccountId);

      if (account.charges_enabled && account.payouts_enabled) {
        // Already fully onboarded, return dashboard link instead
        const dashboardLink = await createExpressDashboardLink(franchisee.stripeAccountId);
        return NextResponse.json({
          success: true,
          alreadyOnboarded: true,
          dashboardUrl: dashboardLink,
        });
      }

      // Not fully onboarded, generate new onboarding link
      const onboardingUrl = await createConnectOnboardingLink(
        franchisee.stripeAccountId,
        `${baseUrl}/admin/royalties/franchisee/${franchiseeId}?stripe=refresh`,
        `${baseUrl}/admin/royalties/franchisee/${franchiseeId}?stripe=complete`
      );

      return NextResponse.json({
        success: true,
        onboardingUrl,
        accountId: franchisee.stripeAccountId,
      });
    }

    // Create new Stripe Connect account
    const businessName = `${franchisee.prospect.firstName} ${franchisee.prospect.lastName} - Acme Franchise`;
    const account = await createConnectAccount(
      franchisee.prospect.email,
      businessName
    );

    // Save account ID to database
    await db.franchiseeAccount.update({
      where: { id: franchiseeId },
      data: { stripeAccountId: account.id },
    });

    // Generate onboarding link
    const onboardingUrl = await createConnectOnboardingLink(
      account.id,
      `${baseUrl}/admin/royalties/franchisee/${franchiseeId}?stripe=refresh`,
      `${baseUrl}/admin/royalties/franchisee/${franchiseeId}?stripe=complete`
    );

    console.log(`[Stripe Connect] Created account ${account.id} for franchisee ${franchiseeId}`);

    return NextResponse.json({
      success: true,
      onboardingUrl,
      accountId: account.id,
    });
  } catch (error: unknown) {
    console.error('Error setting up Stripe Connect:', error);

    // Extract Stripe error message if available
    let errorMessage = 'Failed to set up Stripe Connect';
    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = (error as { message: string }).message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/admin/royalties/franchisee/[franchiseeId]/stripe - Get Stripe account status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ franchiseeId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { franchiseeId } = await params;

    const franchisee = await db.franchiseeAccount.findUnique({
      where: { id: franchiseeId },
    });

    if (!franchisee) {
      return NextResponse.json({ error: 'Franchisee not found' }, { status: 404 });
    }

    if (!franchisee.stripeAccountId) {
      return NextResponse.json({
        hasAccount: false,
        onboarded: false,
      });
    }

    // Get account details from Stripe
    const account = await getConnectAccount(franchisee.stripeAccountId);

    const isOnboarded = account.charges_enabled && account.payouts_enabled;

    // Update local onboarding status if changed
    if (isOnboarded && !franchisee.stripeOnboarded) {
      await db.franchiseeAccount.update({
        where: { id: franchiseeId },
        data: {
          stripeOnboarded: true,
          stripeOnboardedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      hasAccount: true,
      accountId: franchisee.stripeAccountId,
      onboarded: isOnboarded,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch (error) {
    console.error('Error getting Stripe status:', error);
    return NextResponse.json(
      { error: 'Failed to get Stripe status' },
      { status: 500 }
    );
  }
}
