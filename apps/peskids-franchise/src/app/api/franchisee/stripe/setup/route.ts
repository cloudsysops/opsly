import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  createConnectAccount,
  createConnectOnboardingLink,
  getConnectAccount,
  createExpressDashboardLink,
} from '@/lib/stripe';

export const dynamic = "force-dynamic";

// POST /api/franchisee/stripe/setup - Create or continue Stripe Connect onboarding
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get prospect and franchisee account
    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: {
        franchiseeAccount: true,
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    }

    if (!prospect.franchiseeAccount) {
      return NextResponse.json({ error: 'Franchisee account not found' }, { status: 404 });
    }

    const franchisee = prospect.franchiseeAccount;
    const baseUrl = process.env.NEXTAUTH_URL || 'https://franchise-stc-993771038de6.herokuapp.com';

    // If they already have an account, check status and generate appropriate link
    if (franchisee.stripeAccountId) {
      const account = await getConnectAccount(franchisee.stripeAccountId);

      if (account.charges_enabled && account.payouts_enabled) {
        // Already fully onboarded, return dashboard link
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
        `${baseUrl}/portal/payments?stripe=refresh`,
        `${baseUrl}/portal/payments?stripe=complete`
      );

      return NextResponse.json({
        success: true,
        onboardingUrl,
        accountId: franchisee.stripeAccountId,
      });
    }

    // Create new Stripe Connect account
    const businessName = `${prospect.firstName} ${prospect.lastName} - Acme Franchise`;
    const account = await createConnectAccount(
      prospect.email,
      businessName
    );

    // Save account ID to database
    await db.franchiseeAccount.update({
      where: { id: franchisee.id },
      data: { stripeAccountId: account.id },
    });

    // Generate onboarding link
    const onboardingUrl = await createConnectOnboardingLink(
      account.id,
      `${baseUrl}/portal/payments?stripe=refresh`,
      `${baseUrl}/portal/payments?stripe=complete`
    );

    console.log(`[Stripe Connect] Created account ${account.id} for franchisee ${franchisee.id}`);

    return NextResponse.json({
      success: true,
      onboardingUrl,
      accountId: account.id,
    });
  } catch (error: unknown) {
    console.error('Error setting up Stripe Connect:', error);

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
