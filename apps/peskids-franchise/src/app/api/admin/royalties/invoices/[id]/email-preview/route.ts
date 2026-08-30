import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getMonthName } from '@/lib/royalties/invoice-generator';

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXTAUTH_URL || 'https://franchise-stc-993771038de6.herokuapp.com';

// GET /api/admin/royalties/invoices/[id]/email-preview - Get email preview
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch invoice with franchisee details
    const invoice = await db.royaltyInvoice.findUnique({
      where: { id },
      include: {
        franchiseeAccount: {
          include: {
            prospect: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const franchiseeName = `${invoice.franchiseeAccount.prospect.firstName} ${invoice.franchiseeAccount.prospect.lastName}`;
    const franchiseeEmail = invoice.franchiseeAccount.prospect.email;
    const monthName = getMonthName(invoice.month);
    const dueDateStr = invoice.dueDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const reviewUrl = `${BASE_URL}/portal/royalties/${id}`;

    const subject = `Royalty Invoice ${invoice.invoiceNumber} - ${monthName} ${invoice.year}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2D2F8E 0%, #6A469D 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .invoice-box { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .row:last-child { border-bottom: none; }
    .label { color: #666; }
    .value { font-weight: 600; }
    .total { font-size: 18px; color: #2D2F8E; }
    .cta { text-align: center; margin: 30px 0; }
    .cta a { background: #34B256; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Acme Franchise</h1>
      <p style="margin: 10px 0 0;">Royalty Invoice for ${monthName} ${invoice.year}</p>
    </div>
    <div class="content">
      <p>Hi ${franchiseeName},</p>
      <p>Your royalty invoice for <strong>${monthName} ${invoice.year}</strong> is ready for review.</p>

      <div class="invoice-box">
        <div class="row">
          <span class="label">Invoice Number:</span>
          <span class="value">${invoice.invoiceNumber}</span>
        </div>
        <div class="row">
          <span class="label">Period:</span>
          <span class="value">${monthName} ${invoice.year}</span>
        </div>
        <div class="row">
          <span class="label">Gross Revenue:</span>
          <span class="value">$${Number(invoice.grossRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="row">
          <span class="label total">Total Due:</span>
          <span class="value total">$${Number(invoice.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="row">
          <span class="label">Due Date:</span>
          <span class="value">${dueDateStr}</span>
        </div>
      </div>

      <p>Please review your invoice and verify the revenue figures match your records. If everything looks correct, approve the invoice. If you have questions or need to dispute any figures, use the portal to submit your concerns.</p>

      <div class="cta">
        <a href="${reviewUrl}">Review Invoice</a>
      </div>

      <p>If you have any questions, please reply to this email or contact our franchising team.</p>

      <p>Thank you for being part of the Acme Franchise family!</p>

      <p>Best regards,<br>The Acme Franchise Team</p>
    </div>
    <div class="footer">
      <p>Acme Franchise Franchising<br>
      <a href="${BASE_URL}">franchise.acmefranchise.com</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return NextResponse.json({
      to: franchiseeEmail,
      subject,
      html,
      attachments: [
        {
          name: `${invoice.invoiceNumber}.pdf`,
          type: 'application/pdf',
        },
      ],
    });
  } catch (error) {
    console.error('Error generating email preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate email preview' },
      { status: 500 }
    );
  }
}
