import { NextRequest, NextResponse } from "next/server";
import { calculateMonthlyPQS } from "@/lib/feedback/calculator";

export const dynamic = "force-dynamic";

// Monthly cron to calculate PQS for the previous month
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    // Calculate for previous month (since this runs on the 1st)
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    const year =
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const result = await calculateMonthlyPQS(year, month);

    return NextResponse.json({
      success: true,
      period: { year, month },
      scores: {
        nps: result.npsScore,
        ces: result.cesScore,
        trend: result.trend,
        totalFeedback: result.totalFeedbackCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("PQS calculation failed:", error);
    return NextResponse.json(
      { error: "Failed to calculate PQS" },
      { status: 500 }
    );
  }
}

// POST allows manual calculation for a specific month
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { year, month } = body;

    if (!year || !month) {
      return NextResponse.json(
        { error: "Year and month are required" },
        { status: 400 }
      );
    }

    const result = await calculateMonthlyPQS(year, month);

    return NextResponse.json({
      success: true,
      period: { year, month },
      scores: {
        nps: result.npsScore,
        ces: result.cesScore,
        trend: result.trend,
        totalFeedback: result.totalFeedbackCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("PQS calculation failed:", error);
    return NextResponse.json(
      { error: "Failed to calculate PQS" },
      { status: 500 }
    );
  }
}
