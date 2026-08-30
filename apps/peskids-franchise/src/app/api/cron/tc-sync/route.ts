import { NextRequest, NextResponse } from 'next/server';
import { syncCurrentMonth, syncPreviousMonth, updateAllYTDRevenue } from '@/lib/tutorcruncher';

export const dynamic = "force-dynamic";

// POST /api/cron/tc-sync - Sync TutorCruncher data (called by Heroku Scheduler)
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { mode = 'current' } = body;

    console.log(`[TC Sync Cron] Starting sync in ${mode} mode`);

    let results;

    switch (mode) {
      case 'current':
        // Sync current month
        results = await syncCurrentMonth();
        break;

      case 'previous':
        // Sync previous month (for end-of-month processing)
        results = await syncPreviousMonth();
        break;

      case 'both':
        // Sync both current and previous month
        await syncPreviousMonth();
        results = await syncCurrentMonth();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid mode. Use: current, previous, or both' },
          { status: 400 }
        );
    }

    // Update YTD revenue for all franchisees
    await updateAllYTDRevenue();

    // Count results
    let success = 0;
    let failed = 0;

    results.forEach((snapshot) => {
      if (snapshot) {
        success++;
      } else {
        failed++;
      }
    });

    console.log(
      `[TC Sync Cron] Complete: ${success} succeeded, ${failed} failed`
    );

    return NextResponse.json({
      success: true,
      mode,
      synced: success,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[TC Sync Cron] Error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Simple health check / status
export async function GET(request: NextRequest) {
  // Verify cron secret for GET as well
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/cron/tc-sync',
    methods: ['GET', 'POST'],
    modes: ['current', 'previous', 'both'],
    timestamp: new Date().toISOString(),
  });
}
