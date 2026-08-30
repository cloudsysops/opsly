import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXTAUTH_URL || 'https://franchise-stc-993771038de6.herokuapp.com';

// POST /api/franchisee/invoices/[id]/checkout - Create Stripe Checkout session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the prospect and verify they have access to this invoice
    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: {
        franchiseeAccount: {
          include: {
            invoices: {
              where: { id },
              include: {
                payments: true,
              },
            },
          },
        },
      },
    });

    if (!prospect?.franchiseeAccount) {
      return NextResponse.json({ error: 'Franchisee account not found' }, { status: 404 });
    }

    const invoice = prospect.franchiseeAccount.invoices[0];
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check invoice status allows payment
    const payableStatuses = ['APPROVED', 'PAYMENT_PENDING', 'OVERDUE'];
    if (!payableStatuses.includes(invoice.status)) {
      return NextResponse.json(
        { error: 'This invoice is not ready for payment' },
        { status: 400 }
      );
    }

    // Calculate remaining amount
    const totalPaid = invoice.payments
      .filter(p => p.status === 'SUCCEEDED')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const remainingAmount = Number(invoice.totalAmount) - totalPaid;

    if (remainingAmount <= 0) {
      return NextResponse.json(
        { error: 'This invoice is already fully paid' },
        { status: 400 }
      );
    }

    // Get month name for description
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[invoice.month - 1];

    // Create Stripe Checkout session
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['us_bank_account', 'card'],
      mode: 'payment',
      customer_email: session.user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Royalty Invoice ${invoice.invoiceNumber}`,
              description: `${monthName} ${invoice.year} Royalties - Acme Franchise`,
            },
            unit_amount: Math.round(remainingAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          franchiseeAccountId: prospect.franchiseeAccount.id,
          type: 'royalty_payment',
        },
      },
      success_url: `${BASE_URL}/portal/royalties/${id}?payment=success`,
      cancel_url: `${BASE_URL}/portal/royalties/${id}?payment=cancelled`,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        franchiseeAccountId: prospect.franchiseeAccount.id,
      },
    });

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
