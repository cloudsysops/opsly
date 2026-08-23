import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  createConnectAccount,
  createConnectOnboardingLink,
  isAccountOnboarded,
  createExpressDashboardLink,
} from '@/lib/stripe';

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXTAUTH_URL || 'https://franchise-stc-993771038de6.herokuapp.com';

// POST /api/stripe/connect - Create or get Stripe Connect onboarding link
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the prospect for this user
    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: {
        franchiseeAccount: true,
      },
    });

    if (!prospect || prospect.pipelineStage !== 'SELECTED') {
      return NextResponse.json(
        { error: 'Not a selected franchisee' },
        { status: 403 }
      );
    }

    if (!prospect.franchiseeAccount) {
      return NextResponse.json(
        { error: 'Franchisee account not set up' },
        { status: 400 }
      );
    }

    const franchiseeAccount = prospect.franchiseeAccount;

    // Check if account already exists and is onboarded
    if (franchiseeAccount.stripeAccountId && franchiseeAccount.stripeOnboarded) {
      // Return dashboard link instead
      const dashboardUrl = await createExpressDashboardLink(
        franchiseeAccount.stripeAccountId
      );
      return NextResponse.json({
        status: 'onboarded',
        dashboardUrl,
        message: 'Your payment account is set up. Access your dashboard to manage payments.',
      });
    }

    // Create account if doesn't exist
    let stripeAccountId = franchiseeAccount.stripeAccountId;

    if (!stripeAccountId) {
      const account = await createConnectAccount(
        prospect.email,
        `${prospect.firstName} ${prospect.lastName} - Acme Franchise`
      );
      stripeAccountId = account.id;

      // Save to database
      await db.franchiseeAccount.update({
        where: { id: franchiseeAccount.id },
        data: { stripeAccountId },
      });
    }

    // Check if already onboarded
    const onboarded = await isAccountOnboarded(stripeAccountId);

    if (onboarded) {
      // Update database
      await db.franchiseeAccount.update({
        where: { id: franchiseeAccount.id },
        data: {
          stripeOnboarded: true,
          stripeOnboardedAt: new Date(),
        },
      });

      const dashboardUrl = await createExpressDashboardLink(stripeAccountId);
      return NextResponse.json({
        status: 'onboarded',
        dashboardUrl,
        message: 'Your payment account is now active!',
      });
    }

    // Create onboarding link
    const onboardingUrl = await createConnectOnboardingLink(
      stripeAccountId,
      `${BASE_URL}/portal/payments?refresh=true`, // Refresh URL if link expires
      `${BASE_URL}/portal/payments?success=true` // Return URL after completion
    );

    return NextResponse.json({
      status: 'pending',
      onboardingUrl,
      message: 'Complete your payment account setup with Stripe.',
    });
  } catch (error) {
    console.error('Error with Stripe Connect:', error);
    return NextResponse.json(
      { error: 'Failed to set up payment account' },
      { status: 500 }
    );
  }
}

// GET /api/stripe/connect - Get Connect account status
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: {
        franchiseeAccount: true,
      },
    });

    if (!prospect?.franchiseeAccount) {
      return NextResponse.json({
        status: 'not_setup',
        hasAccount: false,
        isOnboarded: false,
      });
    }

    const account = prospect.franchiseeAccount;

    if (!account.stripeAccountId) {
      return NextResponse.json({
        status: 'not_setup',
        hasAccount: false,
        isOnboarded: false,
      });
    }

    // Check current onboarding status
    const onboarded = await isAccountOnboarded(account.stripeAccountId);

    // Update database if status changed
    if (onboarded && !account.stripeOnboarded) {
      await db.franchiseeAccount.update({
        where: { id: account.id },
        data: {
          stripeOnboarded: true,
          stripeOnboardedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      status: onboarded ? 'active' : 'pending',
      hasAccount: true,
      isOnboarded: onboarded,
      stripeAccountId: account.stripeAccountId,
      onboardedAt: account.stripeOnboardedAt,
    });
  } catch (error) {
    console.error('Error checking Stripe Connect status:', error);
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}
