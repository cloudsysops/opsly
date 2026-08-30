import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateInvoicePDF } from '@/lib/royalties/pdf-generator';
import { db } from '@/lib/db';

export const dynamic = "force-dynamic";

// GET /api/admin/royalties/invoices/[id]/pdf - Get invoice PDF
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

    // Verify invoice exists
    const invoice = await db.royaltyInvoice.findUnique({
      where: { id },
      select: { invoiceNumber: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check for download param
    const searchParams = request.nextUrl.searchParams;
    const download = searchParams.get('download') === 'true';

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(id);

    // Return PDF with appropriate headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length.toString(),
    };

    if (download) {
      headers['Content-Disposition'] = `attachment; filename="${invoice.invoiceNumber}.pdf"`;
    } else {
      headers['Content-Disposition'] = `inline; filename="${invoice.invoiceNumber}.pdf"`;
    }

    return new Response(new Uint8Array(pdfBuffer), { headers });
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
