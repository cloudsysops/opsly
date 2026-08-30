import { NextRequest, NextResponse } from "next/server";
import { calculateHealthScores } from "@/lib/health-scores/calculator";

export const dynamic = "force-dynamic";

// This cron runs monthly to calculate health scores for all franchisees
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    // Calculate for previous month (since current month isn't complete)
    const month = now.getMonth() === 0 ? 12 : now.getMonth();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const results = await calculateHealthScores(year, month);

    return NextResponse.json({
      success: true,
      period: { year, month },
      scoresCalculated: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health scores calculation failed:", error);
    return NextResponse.json(
      { error: "Failed to calculate health scores" },
      { status: 500 }
    );
  }
}

// POST allows manual calculation for a specific month
export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
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

    const results = await calculateHealthScores(year, month);

    return NextResponse.json({
      success: true,
      period: { year, month },
      scoresCalculated: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health scores calculation failed:", error);
    return NextResponse.json(
      { error: "Failed to calculate health scores" },
      { status: 500 }
    );
  }
}
