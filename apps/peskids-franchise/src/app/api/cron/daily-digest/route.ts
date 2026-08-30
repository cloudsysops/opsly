import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDailyDigest, DailyDigestData } from "@/lib/email/notifications";

export const dynamic = "force-dynamic";

// This endpoint is called by Heroku Scheduler or can be triggered manually
// Protect with a secret key in production
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // Verify authorization via header only (never accept secrets in query params)
    const authHeader = request.headers.get("authorization");

    if (!CRON_SECRET) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculate date range (last 24 hours)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Count new inquiries (created in the last 24 hours)
    const newInquiries = await db.prospect.count({
      where: {
        createdAt: { gte: yesterday },
      },
    });

    // Count prospects who started pre-work in the last 24 hours
    const preWorkStarted = await db.prospect.count({
      where: {
        preWorkStartedAt: { gte: yesterday },
      },
    });

    // Count prospects who completed pre-work in the last 24 hours
    const preWorkCompleted = await db.prospect.count({
      where: {
        preWorkCompletedAt: { gte: yesterday },
      },
    });

    // Get high-score prospects (score >= 75)
    const highScoreProspects = await db.prospect.findMany({
      where: {
        prospectScore: { gte: 75 },
        pipelineStage: {
          notIn: ["SELECTED", "REJECTED", "WITHDRAWN"],
        },
      },
      orderBy: { prospectScore: "desc" },
      take: 5,
      select: {
        firstName: true,
        lastName: true,
        prospectScore: true,
        preferredTerritory: true,
      },
    });

    // Get stale pipeline (no activity in 7+ days, excluding closed statuses)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const stalePipeline = await db.prospect.findMany({
      where: {
        updatedAt: { lt: sevenDaysAgo },
        pipelineStage: {
          notIn: ["SELECTED", "REJECTED", "WITHDRAWN"],
        },
      },
      orderBy: { updatedAt: "asc" },
      take: 10,
      select: {
        firstName: true,
        lastName: true,
        pipelineStage: true,
        updatedAt: true,
      },
    });

    // Get hot prospect alerts from the last 24 hours
    const hotProspectLogs = await db.notificationLog.findMany({
      where: {
        type: "HIGH_SCORE_ALERT",
        sentAt: { gte: yesterday },
      },
      orderBy: { sentAt: "desc" },
    });

    const hotProspectAlerts = hotProspectLogs.map((log) => {
      const meta = log.metadata as Record<string, unknown>;
      return {
        type: (meta.alertType as string) || "unknown",
        subject: log.subject,
        details: (meta.details as Record<string, unknown>) || {},
      };
    });

    // Check for stale benchmarks
    const currentYear = new Date().getFullYear();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const staleBenchmarks = await db.industryBenchmark.findMany({
      where: {
        isActive: true,
        OR: [
          { dataYear: { lt: currentYear - 1 } },
          { lastVerifiedAt: null },
          { lastVerifiedAt: { lt: oneYearAgo } },
        ],
      },
      select: {
        companyName: true,
        dataYear: true,
        lastVerifiedAt: true,
      },
      orderBy: { dataYear: "asc" },
    });

    // Prepare digest data
    const digestData: DailyDigestData = {
      newInquiries,
      preWorkStarted,
      preWorkCompleted,
      highScoreProspects: highScoreProspects.map((p) => ({
        name: `${p.firstName} ${p.lastName}`,
        score: p.prospectScore,
        territory: p.preferredTerritory || "Not specified",
      })),
      stalePipeline: stalePipeline.map((p) => ({
        name: `${p.firstName} ${p.lastName}`,
        stage: formatPipelineStage(p.pipelineStage),
        daysSinceUpdate: Math.floor(
          (now.getTime() - p.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })),
      hotProspectAlerts,
      staleBenchmarks: staleBenchmarks.map(b => ({
        companyName: b.companyName,
        dataYear: b.dataYear,
        lastVerifiedAt: b.lastVerifiedAt ? b.lastVerifiedAt.toISOString() : null,
      })),
    };

    // Send the digest
    await sendDailyDigest(digestData);

    // Log to notification log
    await db.notificationLog.create({
      data: {
        type: "DAILY_DIGEST",
        recipientEmail: "admins",
        subject: `Daily Digest - ${new Date().toLocaleDateString()}`,
        metadata: {
          newInquiries,
          preWorkStarted,
          preWorkCompleted,
          highScoreCount: highScoreProspects.length,
          staleCount: stalePipeline.length,
          hotProspectAlertCount: hotProspectAlerts.length,
          staleBenchmarkCount: staleBenchmarks.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Daily digest sent",
      stats: {
        newInquiries,
        preWorkStarted,
        preWorkCompleted,
        highScoreProspects: highScoreProspects.length,
        stalePipeline: stalePipeline.length,
        hotProspectAlerts: hotProspectAlerts.length,
      },
    });
  } catch (error) {
    console.error("Daily digest error:", error);
    return NextResponse.json(
      { error: "Failed to send daily digest" },
      { status: 500 }
    );
  }
}

function formatPipelineStage(stage: string): string {
  const stageLabels: Record<string, string> = {
    NEW_INQUIRY: "New Inquiry",
    INITIAL_CONTACT: "Initial Contact",
    DISCOVERY_CALL: "Discovery Call",
    PRE_WORK_IN_PROGRESS: "Pre-Work In Progress",
    PRE_WORK_COMPLETE: "Pre-Work Complete",
    INTERVIEW: "Interview",
    SELECTION_REVIEW: "Selection Review",
    SELECTED: "Selected",
    REJECTED: "Rejected",
    WITHDRAWN: "Withdrawn",
  };
  return stageLabels[stage] || stage;
}
