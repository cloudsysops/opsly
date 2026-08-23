import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateAllInvoices, generateInvoiceForFranchisee } from '@/lib/royalties';
import { syncAllFranchiseesMonth, syncFranchiseeMonth } from '@/lib/tutorcruncher';

export const dynamic = "force-dynamic";

// POST /api/admin/royalties/generate - Generate invoices for a month
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { year, month, franchiseeAccountId, syncFirst = true } = body;

    if (!year || !month) {
      return NextResponse.json(
        { error: 'Year and month are required' },
        { status: 400 }
      );
    }

    // Validate month/year
    const parsedYear = parseInt(year);
    const parsedMonth = parseInt(month);

    if (parsedMonth < 1 || parsedMonth > 12) {
      return NextResponse.json(
        { error: 'Invalid month (must be 1-12)' },
        { status: 400 }
      );
    }

    // Sync TutorCruncher data first if requested
    if (syncFirst) {
      console.log(`[Invoice Generation] Syncing TC data for ${parsedYear}/${parsedMonth}`);

      if (franchiseeAccountId) {
        await syncFranchiseeMonth(franchiseeAccountId, parsedYear, parsedMonth);
      } else {
        await syncAllFranchiseesMonth(parsedYear, parsedMonth);
      }
    }

    // Generate invoices
    if (franchiseeAccountId) {
      // Generate for specific franchisee
      const result = await generateInvoiceForFranchisee(
        franchiseeAccountId,
        parsedYear,
        parsedMonth
      );

      if (result.success) {
        return NextResponse.json({
          success: true,
          invoice: result.invoice,
          message: `Invoice generated: ${result.invoice?.invoiceNumber}`,
        });
      } else {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
    } else {
      // Generate for all franchisees
      const results = await generateAllInvoices(parsedYear, parsedMonth);

      return NextResponse.json({
        success: true,
        generated: results.success,
        failed: results.failed,
        skipped: results.skipped,
        errors: results.errors,
        message: `Generated ${results.success} invoices, ${results.skipped} skipped, ${results.failed} failed`,
      });
    }
  } catch (error) {
    console.error('Error generating invoices:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoices' },
      { status: 500 }
    );
  }
}
