import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createExpressDashboardLink } from '@/lib/stripe';

export const dynamic = "force-dynamic";

// POST /api/franchisee/stripe/dashboard - Get Stripe Express dashboard link
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

    if (!franchisee.stripeAccountId) {
      return NextResponse.json(
        { error: 'No Stripe account connected' },
        { status: 400 }
      );
    }

    const dashboardUrl = await createExpressDashboardLink(franchisee.stripeAccountId);

    return NextResponse.json({
      success: true,
      url: dashboardUrl,
    });
  } catch (error) {
    console.error('Error getting Stripe dashboard link:', error);
    return NextResponse.json(
      { error: 'Failed to get Stripe dashboard link' },
      { status: 500 }
    );
  }
}
