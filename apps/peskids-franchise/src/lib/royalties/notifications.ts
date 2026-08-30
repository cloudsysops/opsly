import { sendEmail } from '@/lib/email/sendgrid';
import { getMonthName } from './invoice-generator';
import { generateInvoicePDF } from './pdf-generator';

const ADMIN_EMAILS = [
  'franchising@acmefranchise.com',
  'admin@acmefranchise.com',
];

const BASE_URL = process.env.NEXTAUTH_URL || 'https://franchise-stc-993771038de6.herokuapp.com';

interface InvoiceNotificationData {
  franchiseeName: string;
  franchiseeEmail: string;
  invoiceNumber: string;
  invoiceId: string;
  year: number;
  month: number;
  grossRevenue: number;
  totalAmount: number;
  dueDate: Date;
  customSubject?: string;
  personalNote?: string;
}

// Send invoice to franchisee for review
export async function sendInvoiceForReview(
  data: InvoiceNotificationData
): Promise<void> {
  const monthName = getMonthName(data.month);
  const dueDateStr = data.dueDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const reviewUrl = `${BASE_URL}/portal/royalties/${data.invoiceId}`;

  // Build personal note HTML if provided
  const personalNoteHtml = data.personalNote
    ? `<div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0; color: #92400E; font-style: italic;">${data.personalNote.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>
      </div>`
    : '';

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
      <h1>🏰 Acme Franchise</h1>
      <p style="margin: 10px 0 0;">Royalty Invoice for ${monthName} ${data.year}</p>
    </div>
    <div class="content">
      ${personalNoteHtml}
      <p>Hi ${data.franchiseeName},</p>
      <p>Your royalty invoice for <strong>${monthName} ${data.year}</strong> is ready for review.</p>

      <div class="invoice-box">
        <div class="row">
          <span class="label">Invoice Number:</span>
          <span class="value">${data.invoiceNumber}</span>
        </div>
        <div class="row">
          <span class="label">Period:</span>
          <span class="value">${monthName} ${data.year}</span>
        </div>
        <div class="row">
          <span class="label">Gross Revenue:</span>
          <span class="value">$${data.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="row">
          <span class="label total">Total Due:</span>
          <span class="value total">$${data.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
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

  // Generate PDF attachment
  let attachments;
  try {
    const pdfBuffer = await generateInvoicePDF(data.invoiceId);
    attachments = [{
      Name: `${data.invoiceNumber}.pdf`,
      Content: pdfBuffer.toString('base64'),
      ContentType: 'application/pdf',
    }];
  } catch (error) {
    console.error('Failed to generate PDF attachment:', error);
    // Send email without attachment if PDF generation fails
  }

  // Use custom subject if provided, otherwise default
  const subject = data.customSubject || `Royalty Invoice ${data.invoiceNumber} - ${monthName} ${data.year}`;

  await sendEmail({
    to: data.franchiseeEmail,
    subject,
    html,
    attachments,
  });
}

// Send dispute notification to admin
export async function sendDisputeNotification(
  data: InvoiceNotificationData & { disputeNotes: string }
): Promise<void> {
  const monthName = getMonthName(data.month);
  const adminUrl = `${BASE_URL}/admin/royalties/invoices/${data.invoiceId}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #F79A30; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .dispute-box { background: #FFF3CD; border: 1px solid #F79A30; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .cta a { background: #2D2F8E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Invoice Dispute</h1>
    </div>
    <div class="content">
      <p><strong>${data.franchiseeName}</strong> has disputed their royalty invoice for ${monthName} ${data.year}.</p>

      <p><strong>Invoice:</strong> ${data.invoiceNumber}<br>
      <strong>Amount:</strong> $${data.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>

      <div class="dispute-box">
        <strong>Franchisee's Notes:</strong>
        <p style="margin-bottom: 0;">${data.disputeNotes}</p>
      </div>

      <p style="margin-top: 20px;">
        <a href="${adminUrl}" class="cta">Review Invoice</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  for (const adminEmail of ADMIN_EMAILS) {
    await sendEmail({
      to: adminEmail,
      subject: `🚨 Invoice Dispute: ${data.franchiseeName} - ${data.invoiceNumber}`,
      html,
    });
  }
}

// Send payment confirmation to franchisee
export async function sendPaymentConfirmation(
  data: InvoiceNotificationData & { paidAmount: number; paidAt: Date }
): Promise<void> {
  const monthName = getMonthName(data.month);
  const paidDateStr = data.paidAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #34B256; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .confirmation-box { background: white; border: 2px solid #34B256; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .amount { font-size: 32px; color: #34B256; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Payment Received</h1>
    </div>
    <div class="content">
      <p>Hi ${data.franchiseeName},</p>

      <p>We've received your payment for the ${monthName} ${data.year} royalty invoice. Thank you!</p>

      <div class="confirmation-box">
        <p style="margin: 0; color: #666;">Amount Paid</p>
        <p class="amount">$${data.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        <p style="margin: 0; color: #666;">Invoice ${data.invoiceNumber} • Paid ${paidDateStr}</p>
      </div>

      <p>You can view your payment history and download receipts in your <a href="${BASE_URL}/portal/royalties">Franchisee Portal</a>.</p>

      <p>Keep up the great work!</p>

      <p>Best regards,<br>The Acme Franchise Team</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  await sendEmail({
    to: data.franchiseeEmail,
    subject: `✓ Payment Received - Invoice ${data.invoiceNumber}`,
    html,
  });
}

// Send overdue reminder
export async function sendOverdueReminder(
  data: InvoiceNotificationData & { daysOverdue: number }
): Promise<void> {
  const monthName = getMonthName(data.month);
  const reviewUrl = `${BASE_URL}/portal/royalties/${data.invoiceId}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #DC3545; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .overdue-box { background: #FFF3CD; border: 2px solid #DC3545; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .cta a { background: #DC3545; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Payment Overdue</h1>
    </div>
    <div class="content">
      <p>Hi ${data.franchiseeName},</p>

      <p>This is a reminder that your royalty payment for ${monthName} ${data.year} is now <strong>${data.daysOverdue} days overdue</strong>.</p>

      <div class="overdue-box">
        <p style="margin: 0; font-size: 14px; color: #666;">Outstanding Amount</p>
        <p style="margin: 10px 0; font-size: 28px; color: #DC3545; font-weight: bold;">$${data.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        <p style="margin: 0; font-size: 14px; color: #666;">Invoice ${data.invoiceNumber}</p>
      </div>

      <p>Please submit your payment as soon as possible to avoid any service disruptions.</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${reviewUrl}" class="cta">Pay Now</a>
      </p>

      <p>If you've already submitted payment, please disregard this notice. If you're experiencing difficulties or need to discuss payment arrangements, please contact us immediately.</p>

      <p>Thank you,<br>The Acme Franchise Team</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  await sendEmail({
    to: data.franchiseeEmail,
    subject: `⚠️ OVERDUE: Royalty Invoice ${data.invoiceNumber} - ${data.daysOverdue} Days Past Due`,
    html,
  });

  // Also notify admins
  for (const adminEmail of ADMIN_EMAILS) {
    await sendEmail({
      to: adminEmail,
      subject: `Overdue Invoice Alert: ${data.franchiseeName} - ${data.invoiceNumber}`,
      html: `
        <p>${data.franchiseeName}'s invoice ${data.invoiceNumber} is ${data.daysOverdue} days overdue.</p>
        <p>Amount: $${data.totalAmount.toFixed(2)}</p>
        <p><a href="${BASE_URL}/admin/royalties/invoices/${data.invoiceId}">View in Admin</a></p>
      `,
    });
  }
}

// Send payment due notification after franchisee approves invoice
export async function sendPaymentDueNotification(
  data: InvoiceNotificationData
): Promise<void> {
  const monthName = getMonthName(data.month);
  const dueDateStr = data.dueDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const payUrl = `${BASE_URL}/portal/royalties/${data.invoiceId}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #34B256 0%, #2D8B47 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .amount-box { background: white; border: 2px solid #34B256; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .amount { font-size: 36px; color: #2D2F8E; font-weight: bold; }
    .cta { text-align: center; margin: 30px 0; }
    .cta a { background: #34B256; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px; }
    .deadline { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; padding: 12px; text-align: center; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invoice Approved - Payment Due</h1>
    </div>
    <div class="content">
      <p>Hi ${data.franchiseeName},</p>

      <p>Thank you for approving your royalty invoice for <strong>${monthName} ${data.year}</strong>. Your payment is now due.</p>

      <div class="amount-box">
        <p style="margin: 0; color: #666; font-size: 14px;">Amount Due</p>
        <p class="amount">$${data.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        <p style="margin: 0; color: #666; font-size: 12px;">Invoice ${data.invoiceNumber}</p>
      </div>

      <div class="deadline">
        <strong>Payment Due: ${dueDateStr}</strong>
      </div>

      <div class="cta">
        <a href="${payUrl}">Pay Now</a>
      </div>

      <p>You can pay securely via credit card or bank transfer through our portal.</p>

      <p>If you have any questions, please reply to this email or contact our franchising team.</p>

      <p>Thank you,<br>The Acme Franchise Team</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  await sendEmail({
    to: data.franchiseeEmail,
    subject: `Payment Due: Invoice ${data.invoiceNumber} - ${monthName} ${data.year}`,
    html,
  });
}
