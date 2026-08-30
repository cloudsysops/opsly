import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF, InvoicePDFData } from '@/components/royalties/InvoicePDF';
import { db } from '@/lib/db';
import React, { ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import path from 'path';

/**
 * Generate a PDF buffer for an invoice
 */
export async function generateInvoicePDF(invoiceId: string): Promise<Buffer> {
  // Fetch invoice with related data
  const invoice = await db.royaltyInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      franchiseeAccount: {
        include: {
          prospect: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  // Get logo path for server-side rendering
  const logoPath = path.join(process.cwd(), 'public', 'logo', 'logo.svg');

  // Prepare data for PDF
  const pdfData: InvoicePDFData = {
    invoiceNumber: invoice.invoiceNumber,
    franchiseeName: `${invoice.franchiseeAccount.prospect.firstName} ${invoice.franchiseeAccount.prospect.lastName}`,
    franchiseeEmail: invoice.franchiseeAccount.prospect.email,
    franchiseePhone: invoice.franchiseeAccount.prospect.phone,
    year: invoice.year,
    month: invoice.month,
    grossRevenue: Number(invoice.grossRevenue),
    royaltyAmount: Number(invoice.royaltyAmount),
    royaltyPercent: Number(invoice.royaltyPercent),
    brandFundAmount: Number(invoice.brandFundAmount),
    brandFundPercent: Number(invoice.brandFundPercent),
    systemsFeeAmount: Number(invoice.systemsFeeAmount),
    systemsFeePercent: Number(invoice.systemsFeePercent),
    adjustmentAmount: invoice.adjustmentAmount ? Number(invoice.adjustmentAmount) : null,
    adjustmentReason: invoice.adjustmentReason,
    totalAmount: Number(invoice.totalAmount),
    status: invoice.status,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    logoPath,
  };

  // Render PDF to buffer
  // Cast is needed because InvoicePDF returns a Document which doesn't match the expected type exactly
  const pdfBuffer = await renderToBuffer(
    React.createElement(InvoicePDF, { data: pdfData }) as unknown as ReactElement<DocumentProps>
  );

  return Buffer.from(pdfBuffer);
}

/**
 * Generate PDF data object from invoice (without rendering)
 * Useful when you need to customize the PDF rendering
 */
export async function getInvoicePDFData(invoiceId: string): Promise<InvoicePDFData> {
  const invoice = await db.royaltyInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      franchiseeAccount: {
        include: {
          prospect: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  return {
    invoiceNumber: invoice.invoiceNumber,
    franchiseeName: `${invoice.franchiseeAccount.prospect.firstName} ${invoice.franchiseeAccount.prospect.lastName}`,
    franchiseeEmail: invoice.franchiseeAccount.prospect.email,
    franchiseePhone: invoice.franchiseeAccount.prospect.phone,
    year: invoice.year,
    month: invoice.month,
    grossRevenue: Number(invoice.grossRevenue),
    royaltyAmount: Number(invoice.royaltyAmount),
    royaltyPercent: Number(invoice.royaltyPercent),
    brandFundAmount: Number(invoice.brandFundAmount),
    brandFundPercent: Number(invoice.brandFundPercent),
    systemsFeeAmount: Number(invoice.systemsFeeAmount),
    systemsFeePercent: Number(invoice.systemsFeePercent),
    adjustmentAmount: invoice.adjustmentAmount ? Number(invoice.adjustmentAmount) : null,
    adjustmentReason: invoice.adjustmentReason,
    totalAmount: Number(invoice.totalAmount),
    status: invoice.status,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
  };
}
