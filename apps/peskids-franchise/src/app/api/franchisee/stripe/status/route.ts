import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getConnectAccount } from '@/lib/stripe';

export const dynamic = "force-dynamic";

// GET /api/franchisee/stripe/status - Get Stripe Connect status for logged-in franchisee
export async function GET() {
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
        where: { id: franchisee.id },
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
