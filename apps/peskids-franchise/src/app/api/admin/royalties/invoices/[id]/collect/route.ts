import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getStripe, getConnectAccount } from '@/lib/stripe';
import { updateInvoiceStatus } from '@/lib/royalties';

export const dynamic = "force-dynamic";

// POST /api/admin/royalties/invoices/[id]/collect - Initiate ACH payment collection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get invoice with franchisee info
    const invoice = await db.royaltyInvoice.findUnique({
      where: { id },
      include: {
        franchiseeAccount: {
          include: {
            prospect: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Validate invoice status
    const collectableStatuses = ['APPROVED', 'PAYMENT_PENDING', 'OVERDUE'];
    if (!collectableStatuses.includes(invoice.status)) {
      return NextResponse.json(
        { error: `Cannot collect payment for invoice with status "${invoice.status}". Invoice must be approved first.` },
        { status: 400 }
      );
    }

    // Check if franchisee has Stripe Connect
    const { stripeAccountId, stripeOnboarded } = invoice.franchiseeAccount;

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'Franchisee has not set up Stripe Connect. Please set up their payment account first.' },
        { status: 400 }
      );
    }

    if (!stripeOnboarded) {
      // Double-check with Stripe
      const account = await getConnectAccount(stripeAccountId);
      if (!account.charges_enabled || !account.payouts_enabled) {
        return NextResponse.json(
          { error: 'Franchisee has not completed Stripe onboarding. They need to finish setting up their payment account.' },
          { status: 400 }
        );
      }
      // Update local status
      await db.franchiseeAccount.update({
        where: { id: invoice.franchiseeAccountId },
        data: { stripeOnboarded: true, stripeOnboardedAt: new Date() },
      });
    }

    const stripe = getStripe();
    const amountInCents = Math.round(Number(invoice.totalAmount) * 100);

    // Create a Checkout Session for ACH payment
    // This allows the franchisee to enter their bank details
    const baseUrl = process.env.NEXTAUTH_URL || 'https://franchise-stc-993771038de6.herokuapp.com';

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['us_bank_account'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Royalty Invoice ${invoice.invoiceNumber}`,
              description: `Acme Franchise royalties for ${invoice.year}-${String(invoice.month).padStart(2, '0')}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          franchiseeAccountId: invoice.franchiseeAccountId,
          type: 'royalty_payment',
        },
      },
      customer_email: invoice.franchiseeAccount.prospect.email,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        franchiseeAccountId: invoice.franchiseeAccountId,
      },
      success_url: `${baseUrl}/admin/royalties/invoices/${invoice.id}?payment=success`,
      cancel_url: `${baseUrl}/admin/royalties/invoices/${invoice.id}?payment=cancelled`,
    });

    // Update invoice status to processing
    await updateInvoiceStatus(id, 'PROCESSING');

    // Store checkout session ID on invoice
    await db.royaltyInvoice.update({
      where: { id },
      data: { stripePaymentIntentId: checkoutSession.id },
    });

    console.log(`[Payment Collection] Created checkout session ${checkoutSession.id} for invoice ${invoice.invoiceNumber}`);

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Error collecting payment:', error);
    return NextResponse.json(
      { error: 'Failed to initiate payment collection' },
      { status: 500 }
    );
  }
}
