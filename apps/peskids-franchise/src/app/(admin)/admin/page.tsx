import { db } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import Link from "next/link";
import { subDays, startOfYear, format } from "date-fns";
import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";
import {
  KPICard,
  AlertsBanner,
  ActionItemsGrid,
  RecentActivityFeed,
  QuickActionsPanel,
} from "@/components/admin/dashboard";

export const revalidate = 0;

// Dynamic import for chart to avoid SSR issues with Recharts
const RevenueTrendChart = nextDynamic(
  () => import("@/components/admin/dashboard/RevenueTrendChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
      </div>
    ),
  }
);

async function getDashboardData() {
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
    totalTasks,

    // Alerts
    franchisorTodos,
    expiringCerts,
    stalledProspects,
    failedWorkflows,

    // Recent Activity
    recentActivities,

    // Operations
    openTickets,
    overdueTickets,
    openCorrectiveActions,
    overdueCorrectiveActions,
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
    db.academyModule.count(),

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
      take: 10,
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

    // Operations stats
    db.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_ADMIN"] } },
    }),
    db.supportTicket.count({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_ADMIN"] },
        slaDeadline: { lt: now },
      },
    }),
    db.correctiveAction.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    db.correctiveAction.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] }, dueDate: { lt: now } },
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

  // Academy progress calculation
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
      month: format(new Date(m.year, m.month - 1), "MMM"),
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
  const royaltiesOverdueAmount = Number(royaltiesOverdue._sum.totalAmount || 0);
  const overdueCount = royaltiesOverdue._count || 0;

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

  return {
    pipeline: {
      activeProspects,
      newThisWeek,
      newThisMonth,
      conversionRate,
      avgDaysToSelection: avgDays,
      byStage,
    },
    financials: {
      ytdRevenue,
      ytdRoyaltiesCollected,
      momGrowth,
      monthlyTrend,
    },
    franchisees: {
      activeCount: activeFranchisees,
      avgAcademyProgress,
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
    operations: {
      openTickets,
      overdueTickets,
      openCorrectiveActions,
      overdueCorrectiveActions,
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
  };
}

const stageLabels: Record<string, string> = {
  NEW_INQUIRY: "New Inquiry",
  INITIAL_CONTACT: "Initial Contact",
  DISCOVERY_CALL: "Discovery",
  PRE_WORK_IN_PROGRESS: "Pre-Work",
  PRE_WORK_COMPLETE: "Ready",
  INTERVIEW: "Interview",
  SELECTION_REVIEW: "Review",
  SELECTED: "Selected",
};

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
};

export default async function CommandCenterDashboard() {
  const data = await getDashboardData();

  // Build high-priority alerts for banner
  const bannerAlerts = [];
  if (data.alerts.overdueInvoices > 0) {
    bannerAlerts.push({
      id: "overdue",
      type: "overdue" as const,
      message: `${data.alerts.overdueInvoices} overdue invoice${data.alerts.overdueInvoices > 1 ? "s" : ""}`,
      href: "/admin/franchisees/invoices?status=PAYMENT_PENDING",
      count: data.alerts.overdueInvoices,
    });
  }
  if (data.alerts.disputedInvoices > 0) {
    bannerAlerts.push({
      id: "disputed",
      type: "disputed" as const,
      message: `${data.alerts.disputedInvoices} disputed invoice${data.alerts.disputedInvoices > 1 ? "s" : ""}`,
      href: "/admin/franchisees/invoices?status=DISPUTED",
      count: data.alerts.disputedInvoices,
    });
  }
  if (data.operations.overdueTickets > 0) {
    bannerAlerts.push({
      id: "overdue-tickets",
      type: "overdue" as const,
      message: `${data.operations.overdueTickets} support ticket${data.operations.overdueTickets > 1 ? "s" : ""} past SLA`,
      href: "/admin/operations/tickets",
      count: data.operations.overdueTickets,
    });
  }
  if (data.operations.overdueCorrectiveActions > 0) {
    bannerAlerts.push({
      id: "overdue-actions",
      type: "overdue" as const,
      message: `${data.operations.overdueCorrectiveActions} overdue corrective action${data.operations.overdueCorrectiveActions > 1 ? "s" : ""}`,
      href: "/admin/operations/audits",
      count: data.operations.overdueCorrectiveActions,
    });
  }

  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">
          Command Center
        </h1>
        <p className="mt-1 text-sm sm:text-base text-gray-600">
          Overview of your franchise business
        </p>
      </div>

      {/* Alerts Banner (high priority only) */}
      <AlertsBanner alerts={bannerAlerts} />

      {/* KPI Grid - 4 sections */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Pipeline Health */}
        <Card className="overflow-hidden">
          <CardHeader className="py-2.5 px-4 border-b border-gray-100 bg-gradient-to-r from-brand-navy/5 to-transparent">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-navy">Pipeline Health</h2>
              <Link
                href="/admin/crm/pipeline"
                className="text-[11px] text-gray-500 hover:text-brand-purple transition-colors"
              >
                View &rarr;
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Active</div>
                <div className="text-2xl font-bold text-brand-navy mt-0.5">
                  {data.pipeline.activeProspects}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">New 7d/30d</div>
                <div className="text-2xl font-bold text-gray-900 mt-0.5">
                  <span className="text-brand-orange">{data.pipeline.newThisWeek}</span>
                  <span className="text-gray-300 mx-1">/</span>
                  <span className="text-gray-600">{data.pipeline.newThisMonth}</span>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Conversion</div>
                <div className="text-2xl font-bold text-brand-green mt-0.5">
                  {data.pipeline.conversionRate}%
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Avg Days</div>
                <div className="text-2xl font-bold text-brand-cyan mt-0.5">
                  {data.pipeline.avgDaysToSelection || "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Snapshot */}
        <Card className="overflow-hidden">
          <CardHeader className="py-2.5 px-4 border-b border-gray-100 bg-gradient-to-r from-brand-green/5 to-transparent">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-navy">Financial Snapshot</h2>
              <Link
                href="/admin/franchisees/financials"
                className="text-[11px] text-gray-500 hover:text-brand-purple transition-colors"
              >
                View &rarr;
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">YTD Revenue</div>
                <div className="text-2xl font-bold text-brand-navy mt-0.5">
                  {formatCurrency(data.financials.ytdRevenue)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Royalties</div>
                <div className="text-2xl font-bold text-brand-green mt-0.5">
                  {formatCurrency(data.financials.ytdRoyaltiesCollected)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">MoM Growth</div>
                <div
                  className={`text-2xl font-bold mt-0.5 ${
                    data.financials.momGrowth >= 0 ? "text-brand-green" : "text-red-600"
                  }`}
                >
                  {data.financials.momGrowth >= 0 ? "+" : ""}
                  {data.financials.momGrowth}%
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Collection</div>
                <div className="text-2xl font-bold text-brand-cyan mt-0.5">
                  {data.financials.ytdRoyaltiesCollected > 0 ? "100%" : "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Franchisee Network */}
        <Card className="overflow-hidden">
          <CardHeader className="py-2.5 px-4 border-b border-gray-100 bg-gradient-to-r from-brand-purple/5 to-transparent">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-navy">Franchisee Network</h2>
              <Link
                href="/admin/franchisees"
                className="text-[11px] text-gray-500 hover:text-brand-purple transition-colors"
              >
                View &rarr;
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Franchisees</div>
                <div className="text-2xl font-bold text-brand-navy mt-0.5">
                  {data.franchisees.activeCount}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Academy</div>
                <div className="text-2xl font-bold text-brand-cyan mt-0.5">
                  {data.franchisees.avgAcademyProgress}%
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Compliance</div>
                <div className="text-2xl font-bold text-brand-green mt-0.5">
                  {data.franchisees.complianceRate}%
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Top Performer</div>
                <div className="text-sm font-bold text-brand-orange mt-1 truncate">
                  {data.franchisees.topPerformer?.name || "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operations */}
        <Card className="overflow-hidden">
          <CardHeader className="py-2.5 px-4 border-b border-gray-100 bg-gradient-to-r from-brand-orange/5 to-transparent">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-navy">Operations</h2>
              <Link
                href="/admin/learning"
                className="text-[11px] text-gray-500 hover:text-brand-purple transition-colors"
              >
                View &rarr;
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Open Tickets</div>
                <div className={`text-2xl font-bold mt-0.5 ${data.operations.openTickets > 0 ? "text-brand-orange" : "text-brand-green"}`}>
                  {data.operations.openTickets}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Overdue SLA</div>
                <div className={`text-2xl font-bold mt-0.5 ${data.operations.overdueTickets > 0 ? "text-red-600" : "text-brand-green"}`}>
                  {data.operations.overdueTickets}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Corrective Actions</div>
                <div className={`text-2xl font-bold mt-0.5 ${data.operations.openCorrectiveActions > 0 ? "text-brand-orange" : "text-brand-green"}`}>
                  {data.operations.openCorrectiveActions}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Overdue Actions</div>
                <div className={`text-2xl font-bold mt-0.5 ${data.operations.overdueCorrectiveActions > 0 ? "text-red-600" : "text-brand-green"}`}>
                  {data.operations.overdueCorrectiveActions}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      {(data.alerts.franchisorTodos > 0 ||
        data.alerts.overdueInvoices > 0 ||
        data.alerts.expiringCerts > 0 ||
        data.alerts.stalledProspects > 0) ? (
        <div>
          <h2 className="text-base font-semibold text-brand-navy mb-3">
            Attention Needed
          </h2>
          <ActionItemsGrid
            alerts={{
              franchisorTodos: data.alerts.franchisorTodos,
              overdueInvoices: data.alerts.overdueInvoices,
              expiringCerts: data.alerts.expiringCerts,
              stalledProspects: data.alerts.stalledProspects,
            }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-brand-navy">
            Attention Needed
          </span>
          <ActionItemsGrid
            alerts={{
              franchisorTodos: 0,
              overdueInvoices: 0,
              expiringCerts: 0,
              stalledProspects: 0,
            }}
          />
        </div>
      )}

      {/* Two Column Layout: Charts + Activity */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Revenue Trend Chart */}
        <Card className="overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-brand-navy">
              Revenue Trend (Last 6 Months)
            </h2>
          </CardHeader>
          <CardContent className="p-4">
            <RevenueTrendChart data={data.financials.monthlyTrend} />
          </CardContent>
        </Card>

        {/* Pipeline Funnel */}
        <Card className="overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-navy">
                Pipeline Funnel
              </h2>
              <Link
                href="/admin/crm/analytics"
                className="text-[11px] text-gray-500 hover:text-brand-purple transition-colors"
              >
                Analytics &rarr;
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-1.5">
              {data.pipeline.byStage.map((stage, index) => {
                const maxCount = Math.max(
                  ...data.pipeline.byStage.map((s) => s.count),
                  1
                );
                const width = stage.count > 0 ? (stage.count / maxCount) * 100 : 3;
                const colors = [
                  "bg-brand-orange",
                  "bg-amber-400",
                  "bg-brand-cyan",
                  "bg-brand-purple",
                  "bg-indigo-500",
                  "bg-blue-500",
                  "bg-brand-navy",
                  "bg-brand-green",
                ];

                return (
                  <div key={stage.stage} className="flex items-center gap-2">
                    <div className="w-16 text-[11px] text-gray-500 text-right truncate">
                      {stageLabels[stage.stage]}
                    </div>
                    <div className="flex-1 h-5 bg-gray-50 rounded overflow-hidden">
                      <div
                        className={`h-full ${colors[index]} flex items-center transition-all rounded`}
                        style={{ width: `${width}%`, minWidth: stage.count > 0 ? '28px' : '12px' }}
                      >
                        <span className={`text-[10px] font-semibold w-full text-center ${stage.count > 0 ? 'text-white' : 'text-gray-400'}`}>
                          {stage.count}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Activity + Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Activity (2/3 width) */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-brand-navy">
              Recent Activity
            </h2>
          </CardHeader>
          <CardContent className="p-4">
            <RecentActivityFeed activities={data.recentActivity} />
          </CardContent>
        </Card>

        {/* Quick Actions (1/3 width) */}
        <Card className="overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-brand-navy">
              Quick Actions
            </h2>
          </CardHeader>
          <CardContent className="p-4">
            <QuickActionsPanel />
          </CardContent>
        </Card>
      </div>
    </WideContainer>
  );
}
