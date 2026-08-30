import { NextRequest, NextResponse } from "next/server";
import { processScheduledActions } from "@/lib/automation/workflow-engine";

export const dynamic = "force-dynamic";

/**
 * Cron endpoint to process scheduled workflow actions
 * Should be called every minute (or every 5 minutes)
 *
 * POST /api/cron/workflow-processor
 *
 * Headers:
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret in production
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${expectedSecret}`) {
      console.warn("[Workflow Processor] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Workflow Processor] Starting scheduled action processing");

    const processed = await processScheduledActions();

    console.log(`[Workflow Processor] Processed ${processed} actions`);

    return NextResponse.json({
      success: true,
      processed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Workflow Processor] Error:", error);
    return NextResponse.json(
      {
        error: "Processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request);
}
