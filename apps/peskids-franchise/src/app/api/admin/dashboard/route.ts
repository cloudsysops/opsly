import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays, startOfYear, startOfMonth, subMonths, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const thirtyDaysAgo = subDays(now, 30);
  const fourteenDaysAgo = subDays(now, 14);
  const yearStart = startOfYear(now);
  const thirtyDaysFromNow = subDays(now, -30);

  // Run all queries in parallel
  const [
    // Pipeline Health
    activeProspects,
    newThisWeek,
    newThisMonth,
    selectedCount,
    rejectedCount,
    pipelineByStage,
    avgDaysToSelection,
    preWorkStats,

    // Financial Data
    ytdSnapshots,
    royaltiesCollected,
    royaltiesPending,
    royaltiesOverdue,
    disputedInvoices,
    monthlyRevenueTrend,

    // Franchisee Network
    activeFranchisees,
    academyProgressData,
    certificationStats,
    topPerformer,

    // Alerts
    franchisorTodos,
    expiringCerts,
    stalledProspects,
    failedWorkflows,

    // Recent Activity
    recentActivities,
  ] = await Promise.all([
    // Pipeline Health queries
    db.prospect.count({
      where: {
        pipelineStage: {
          notIn: ["SELECTED", "REJECTED", "WITHDRAWN"],
        },
      },
    }),
    db.prospect.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    db.prospect.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    db.prospect.count({
      where: { pipelineStage: "SELECTED" },
    }),
    db.prospect.count({
      where: { pipelineStage: "REJECTED" },
    }),
    db.prospect.groupBy({
      by: ["pipelineStage"],
      _count: true,
    }),
    db.prospect.findMany({
      where: {
        pipelineStage: "SELECTED",
        selectedAt: { not: null },
      },
      select: {
        createdAt: true,
        selectedAt: true,
      },
    }),
    db.preWorkSubmission.groupBy({
      by: ["status"],
      _count: true,
    }),

    // Financial queries
    db.tutorCruncherSnapshot.aggregate({
      _sum: {
        grossRevenue: true,
      },
      where: {
        createdAt: { gte: yearStart },
      },
    }),
    db.royaltyPayment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: "SUCCEEDED",
        processedAt: { gte: yearStart },
      },
    }),
    db.royaltyInvoice.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        status: {
          in: ["PENDING_REVIEW", "APPROVED", "PAYMENT_PENDING"],
        },
      },
    }),
    db.royaltyInvoice.aggregate({
      _sum: {
        totalAmount: true,
      },
      _count: true,
      where: {
        status: "PAYMENT_PENDING",
        dueDate: { lt: now },
      },
    }),
    db.royaltyInvoice.count({
      where: { status: "DISPUTED" },
    }),
    db.tutorCruncherSnapshot.groupBy({
      by: ["year", "month"],
      _sum: {
        grossRevenue: true,
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 6,
    }),

    // Franchisee Network queries
    db.prospect.count({
      where: { pipelineStage: "SELECTED" },
    }),
    db.academyProgress.findMany({
      where: {
        prospect: { pipelineStage: "SELECTED" },
      },
      select: {
        status: true,
        prospectId: true,
      },
    }),
    db.franchiseeCertification.groupBy({
      by: ["status"],
      _count: true,
    }),
    db.tutorCruncherSnapshot.findFirst({
      where: {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      },
      orderBy: { grossRevenue: "desc" },
      include: {
        franchiseeAccount: {
          include: {
            prospect: {
              select: {
                firstName: true,
                lastName: true,
                preferredTerritory: true,
              },
            },
          },
        },
      },
    }),

    // Alert queries
    db.franchisorTodo.count({
      where: { completedAt: null },
    }),
    db.franchiseeCertification.count({
      where: {
        expiresAt: {
          lte: thirtyDaysFromNow,
          gt: now,
        },
        status: { not: "EXPIRED" },
      },
    }),
    db.prospect.count({
      where: {
        pipelineStage: {
          notIn: ["SELECTED", "REJECTED", "WITHDRAWN"],
        },
        updatedAt: { lt: fourteenDaysAgo },
      },
    }),
    db.workflowExecution.count({
      where: { status: "FAILED" },
    }),

    // Recent Activity
    db.prospectActivity.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      include: {
        prospect: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            pipelineStage: true,
          },
        },
      },
    }),
  ]);

  // Calculate derived metrics
  const conversionRate =
    selectedCount + rejectedCount > 0
      ? Math.round((selectedCount / (selectedCount + rejectedCount)) * 100)
      : 0;

  const avgDays =
    avgDaysToSelection.length > 0
      ? Math.round(
          avgDaysToSelection.reduce((sum, p) => {
            if (p.selectedAt) {
              const days =
                (p.selectedAt.getTime() - p.createdAt.getTime()) /
                (1000 * 60 * 60 * 24);
              return sum + days;
            }
            return sum;
          }, 0) / avgDaysToSelection.length
        )
      : 0;

  const approvedPreWork =
    preWorkStats.find((s) => s.status === "APPROVED")?._count || 0;
  const totalPreWork = preWorkStats.reduce((sum, s) => sum + s._count, 0);
  const preWorkCompletion =
    totalPreWork > 0 ? Math.round((approvedPreWork / totalPreWork) * 100) : 0;

  // Journey progress calculation
  const totalTasks = await db.academyModule.count();
  const franchiseeProgressMap = new Map<string, number>();
  academyProgressData.forEach((p) => {
    const current = franchiseeProgressMap.get(p.prospectId) || 0;
    if (p.status === "COMPLETED") {
      franchiseeProgressMap.set(p.prospectId, current + 1);
    }
  });

  const franchiseeCount = franchiseeProgressMap.size;
  const avgAcademyProgress =
    franchiseeCount > 0 && totalTasks > 0
      ? Math.round(
          (Array.from(franchiseeProgressMap.values()).reduce((a, b) => a + b, 0) /
            (franchiseeCount * totalTasks)) *
            100
        )
      : 0;

  // Compliance rate
  const activeCerts =
    certificationStats.find((s) => s.status === "ACTIVE")?._count || 0;
  const totalCerts = certificationStats.reduce((sum, s) => sum + s._count, 0);
  const complianceRate =
    totalCerts > 0 ? Math.round((activeCerts / totalCerts) * 100) : 0;

  // Revenue trend (last 6 months, reverse to chronological order)
  const monthlyTrend = monthlyRevenueTrend
    .map((m) => ({
      month: format(new Date(m.year, m.month - 1), "MMM yyyy"),
      revenue: Number(m._sum.grossRevenue || 0),
      royalties: Number(m._sum.grossRevenue || 0) * 0.1, // 10% royalty estimate
    }))
    .reverse();

  // Calculate MoM growth
  const currentMonthRevenue = monthlyTrend[monthlyTrend.length - 1]?.revenue || 0;
  const previousMonthRevenue = monthlyTrend[monthlyTrend.length - 2]?.revenue || 0;
  const momGrowth =
    previousMonthRevenue > 0
      ? Math.round(
          ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        )
      : 0;

  // YTD financials
  const ytdRevenue = Number(ytdSnapshots._sum.grossRevenue || 0);
  const ytdRoyaltiesCollected = Number(royaltiesCollected._sum.amount || 0);
  const royaltiesPendingAmount = Number(royaltiesPending._sum.totalAmount || 0);
  const royaltiesOverdueAmount = Number(royaltiesOverdue._sum.totalAmount || 0);
  const overdueCount = royaltiesOverdue._count || 0;
  const collectionRate =
    ytdRoyaltiesCollected + royaltiesPendingAmount + royaltiesOverdueAmount > 0
      ? Math.round(
          (ytdRoyaltiesCollected /
            (ytdRoyaltiesCollected + royaltiesPendingAmount + royaltiesOverdueAmount)) *
            100
        )
      : 0;

  // Pipeline by stage for funnel
  const stageOrder = [
    "NEW_INQUIRY",
    "INITIAL_CONTACT",
    "DISCOVERY_CALL",
    "PRE_WORK_IN_PROGRESS",
    "PRE_WORK_COMPLETE",
    "INTERVIEW",
    "SELECTION_REVIEW",
    "SELECTED",
  ];

  const byStage = stageOrder.map((stage) => ({
    stage,
    count: pipelineByStage.find((s) => s.pipelineStage === stage)?._count || 0,
  }));

  return NextResponse.json({
    pipeline: {
      activeProspects,
      newThisWeek,
      newThisMonth,
      conversionRate,
      avgDaysToSelection: avgDays,
      preWorkCompletion,
      byStage,
    },
    financials: {
      ytdRevenue,
      ytdRoyaltiesCollected,
      royaltiesPending: royaltiesPendingAmount,
      royaltiesOverdue: royaltiesOverdueAmount,
      collectionRate,
      momGrowth,
      monthlyTrend,
    },
    franchisees: {
      activeCount: activeFranchisees,
      avgAcademyProgress,
      onTrackCount: franchiseeCount, // Simplified for now
      complianceRate,
      topPerformer: topPerformer
        ? {
            name: `${topPerformer.franchiseeAccount.prospect.firstName} ${topPerformer.franchiseeAccount.prospect.lastName}`,
            revenue: Number(topPerformer.grossRevenue),
            territory:
              topPerformer.franchiseeAccount.prospect.preferredTerritory || "Unknown",
          }
        : null,
    },
    alerts: {
      overdueInvoices: overdueCount,
      franchisorTodos,
      expiringCerts,
      stalledProspects,
      failedWorkflows,
      disputedInvoices,
    },
    recentActivity: recentActivities.map((a) => ({
      id: a.id,
      type: a.activityType,
      description: a.description,
      timestamp: a.createdAt.toISOString(),
      prospect: {
        id: a.prospect.id,
        name: `${a.prospect.firstName} ${a.prospect.lastName}`,
        stage: a.prospect.pipelineStage,
      },
    })),
  });
}
