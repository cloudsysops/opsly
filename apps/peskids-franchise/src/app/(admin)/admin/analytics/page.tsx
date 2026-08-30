import { db } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = 'force-dynamic';
import AnalyticsCharts from "@/components/admin/AnalyticsCharts";
import DateRangeFilter from "@/components/admin/DateRangeFilter";
import ExportButton from "@/components/admin/ExportButton";
import {
  getTimeSeriesData,
  getTimeInStageData,
  getCohortData,
  STAGE_LABELS,
} from "@/lib/analytics/queries";

interface PageProps {
  searchParams: Promise<{ start?: string; end?: string }>;
}

async function getCustomEventAnalytics(dateRange: { start: Date; end: Date }) {
  const [eventsByType, recentEvents, topEventPages] = await Promise.all([
    // Events grouped by type
    db.customEvent.groupBy({
      by: ["eventType"],
      where: {
        timestamp: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: true,
      orderBy: { _count: { eventType: "desc" } },
    }),

    // Recent custom events
    db.customEvent.findMany({
      where: {
        timestamp: { gte: dateRange.start, lte: dateRange.end },
      },
      orderBy: { timestamp: "desc" },
      take: 20,
    }),

    // Top pages by custom events
    db.customEvent.groupBy({
      by: ["pagePath"],
      where: {
        timestamp: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: true,
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
  ]);

  return {
    eventsByType: eventsByType.map((e) => ({
      type: e.eventType,
      count: e._count,
    })),
    recentEvents,
    topEventPages: topEventPages.map((p) => ({
      path: p.pagePath,
      count: p._count,
    })),
  };
}

async function getVisitorAnalytics(dateRange: { start: Date; end: Date }) {
  const [
    totalVisitors,
    totalSessions,
    totalPageViews,
    sessionsBySource,
    topPages,
    deviceBreakdown,
    conversionFunnel,
    sessionsOverTime,
  ] = await Promise.all([
    // Total unique visitors
    db.visitor.count({
      where: {
        firstSeenAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),

    // Total sessions
    db.visitorSession.count({
      where: {
        startedAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),

    // Total page views
    db.pageView.count({
      where: {
        enteredAt: { gte: dateRange.start, lte: dateRange.end },
      },
    }),

    // Sessions by UTM source
    db.visitorSession.groupBy({
      by: ["utmSource"],
      where: {
        startedAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: true,
      orderBy: { _count: { sessionId: "desc" } },
      take: 10,
    }),

    // Top pages by views
    db.pageView.groupBy({
      by: ["pagePath"],
      where: {
        enteredAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: true,
      _avg: { duration: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),

    // Device breakdown
    db.visitorSession.groupBy({
      by: ["deviceType"],
      where: {
        startedAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: true,
    }),

    // Conversion funnel: total sessions, had Earl chat, submitted form
    Promise.all([
      db.visitorSession.count({
        where: { startedAt: { gte: dateRange.start, lte: dateRange.end } },
      }),
      db.visitorSession.count({
        where: {
          startedAt: { gte: dateRange.start, lte: dateRange.end },
          hadEarlChat: true,
        },
      }),
      db.visitorSession.count({
        where: {
          startedAt: { gte: dateRange.start, lte: dateRange.end },
          submittedForm: true,
        },
      }),
    ]),

    // Sessions over time (last 30 days grouped by day)
    db.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT DATE("startedAt") as date, COUNT(*) as count
      FROM "VisitorSession"
      WHERE "startedAt" >= ${dateRange.start} AND "startedAt" <= ${dateRange.end}
      GROUP BY DATE("startedAt")
      ORDER BY date ASC
    `,
  ]);

  return {
    totalVisitors,
    totalSessions,
    totalPageViews,
    trafficSources: sessionsBySource.map((s) => ({
      source: s.utmSource || "Direct / Organic",
      count: s._count,
    })),
    topPages: topPages.map((p) => ({
      path: p.pagePath,
      views: p._count,
      avgDuration: Math.round(p._avg.duration || 0),
    })),
    deviceBreakdown: deviceBreakdown.map((d) => ({
      device: d.deviceType || "Unknown",
      count: d._count,
    })),
    conversionFunnel: {
      visits: conversionFunnel[0],
      earlChats: conversionFunnel[1],
      formSubmits: conversionFunnel[2],
    },
    sessionsOverTime: sessionsOverTime.map((s) => ({
      date: s.date,
      count: Number(s.count),
    })),
  };
}

async function getAnalyticsData(dateRange: { start: Date; end: Date }) {
  const [
    prospects,
    prospectsInRange,
    preWorkModules,
    chatConversations,
    recentActivity,
  ] = await Promise.all([
    // All prospects with submissions for funnel calculation
    db.prospect.findMany({
      include: {
        preWorkSubmissions: true,
      },
    }),

    // Prospects in date range for filtered stats
    db.prospect.count({
      where: {
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
    }),

    // Pre-work modules
    db.preWorkModule.findMany({
      orderBy: { sequence: "asc" },
    }),

    // Chat conversations
    db.chatConversation.count(),

    // Recent activity
    db.prospectActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        prospect: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  ]);

  // Calculate last 7 and 30 days from today
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const prospectsLast7Days = prospects.filter(
    (p) => p.createdAt >= sevenDaysAgo
  ).length;
  const prospectsLast30Days = prospects.filter(
    (p) => p.createdAt >= thirtyDaysAgo
  ).length;

  // Calculate pipeline stages
  const pipelineOrder = [
    "NEW_INQUIRY",
    "INITIAL_CONTACT",
    "DISCOVERY_CALL",
    "PRE_WORK_IN_PROGRESS",
    "PRE_WORK_COMPLETE",
    "INTERVIEW",
    "SELECTION_REVIEW",
    "SELECTED",
  ];

  const byStage = pipelineOrder.map((stage) => ({
    stage,
    count: prospects.filter((p) => p.pipelineStage === stage).length,
  }));

  // Funnel with conversion rates
  const funnel = pipelineOrder.map((stage, index) => {
    const atOrPastStage = prospects.filter((p) => {
      const pIndex = pipelineOrder.indexOf(p.pipelineStage);
      return (
        pIndex >= index && !["REJECTED", "WITHDRAWN"].includes(p.pipelineStage)
      );
    }).length;

    const prevCount =
      index === 0
        ? prospects.length
        : prospects.filter((p) => {
            const pIndex = pipelineOrder.indexOf(p.pipelineStage);
            return (
              pIndex >= index - 1 &&
              !["REJECTED", "WITHDRAWN"].includes(p.pipelineStage)
            );
          }).length;

    return {
      stage,
      label: STAGE_LABELS[stage],
      count: atOrPastStage,
      dropoff: index > 0 ? prevCount - atOrPastStage : 0,
      conversionRate:
        prevCount > 0 ? Math.round((atOrPastStage / prevCount) * 100) : 100,
    };
  });

  // Interest level breakdown
  const interestLevels = [
    "READY_TO_START",
    "ACTIVELY_SEEKING_FUNDING",
    "SERIOUSLY_CONSIDERING",
    "JUST_EXPLORING",
    "GATHERING_INFORMATION",
  ];

  const byInterest = interestLevels.map((level) => ({
    level,
    count: prospects.filter((p) => p.interestLevel === level).length,
  }));

  // Pre-work module completion
  const moduleStats = preWorkModules.map((module) => {
    const completed = prospects.filter((p) =>
      p.preWorkSubmissions.some(
        (s) =>
          s.moduleId === module.id &&
          ["SUBMITTED", "APPROVED"].includes(s.status)
      )
    ).length;

    return {
      id: module.id,
      title: module.title,
      completed,
      rate:
        prospects.length > 0
          ? Math.round((completed / prospects.length) * 100)
          : 0,
    };
  });

  // Score distribution
  const scoreRanges = [
    { label: "0-25", min: 0, max: 25, color: "bg-red-400" },
    { label: "26-50", min: 26, max: 50, color: "bg-orange-400" },
    { label: "51-75", min: 51, max: 75, color: "bg-yellow-400" },
    { label: "76-100", min: 76, max: 100, color: "bg-green-400" },
  ];

  const scoreDistribution = scoreRanges.map((range) => ({
    ...range,
    count: prospects.filter(
      (p) => p.prospectScore >= range.min && p.prospectScore <= range.max
    ).length,
  }));

  // Territory breakdown
  const territoryMap = prospects.reduce((acc, p) => {
    const territory = p.preferredTerritory || "Not specified";
    acc[territory] = (acc[territory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topTerritories = Object.entries(territoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Pre-work status
  const preWorkStatus = {
    notStarted: prospects.filter((p) => p.preWorkStatus === "NOT_STARTED")
      .length,
    inProgress: prospects.filter((p) => p.preWorkStatus === "IN_PROGRESS")
      .length,
    submitted: prospects.filter((p) => p.preWorkStatus === "SUBMITTED").length,
    approved: prospects.filter((p) => p.preWorkStatus === "APPROVED").length,
  };

  // Rejected/Withdrawn
  const rejected = prospects.filter(
    (p) => p.pipelineStage === "REJECTED"
  ).length;
  const withdrawn = prospects.filter(
    (p) => p.pipelineStage === "WITHDRAWN"
  ).length;

  return {
    totalProspects: prospects.length,
    prospectsInRange,
    prospectsLast30Days,
    prospectsLast7Days,
    byStage,
    funnel,
    byInterest,
    moduleStats,
    scoreDistribution,
    topTerritories,
    preWorkStatus,
    chatConversations,
    recentActivity,
    rejected,
    withdrawn,
    selected: prospects.filter((p) => p.pipelineStage === "SELECTED").length,
  };
}

const interestLabels: Record<string, string> = {
  READY_TO_START: "Ready to Start",
  ACTIVELY_SEEKING_FUNDING: "Seeking Funding",
  SERIOUSLY_CONSIDERING: "Seriously Considering",
  JUST_EXPLORING: "Just Exploring",
  GATHERING_INFORMATION: "Gathering Info",
};

const activityLabels: Record<string, string> = {
  FORM_SUBMITTED: "Submitted inquiry",
  EMAIL_SENT: "Email sent",
  CALL_LOGGED: "Call logged",
  STAGE_CHANGED: "Stage updated",
  PRE_WORK_STARTED: "Started pre-work",
  PRE_WORK_SUBMITTED: "Submitted pre-work",
  DOCUMENT_SIGNED: "Signed document",
  NOTE_ADDED: "Note added",
  SCORE_UPDATED: "Score updated",
  LOGIN: "Logged in",
  PAGE_VIEW: "Page viewed",
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Parse date range from URL params or use defaults (last 90 days)
  const now = new Date();
  const defaultEnd = now.toISOString().split("T")[0];
  const defaultStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const startDate = params.start || defaultStart;
  const endDate = params.end || defaultEnd;

  const dateRange = {
    start: new Date(startDate),
    end: new Date(endDate + "T23:59:59.999Z"),
  };

  // Fetch all data in parallel
  const [data, timeSeriesData, timeInStageData, cohortData, visitorData, customEventsData] = await Promise.all(
    [
      getAnalyticsData(dateRange),
      getTimeSeriesData(dateRange),
      getTimeInStageData(dateRange),
      getCohortData(dateRange),
      getVisitorAnalytics(dateRange),
      getCustomEventAnalytics(dateRange),
    ]
  );

  return (
    <WideContainer className="space-y-6">
      {/* Header with filters and export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">Analytics</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Pipeline insights and prospect metrics
          </p>
        </div>
        <ExportButton startDate={startDate} endDate={endDate} />
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="py-4">
          <Suspense fallback={<div>Loading filters...</div>}>
            <DateRangeFilter startDate={startDate} endDate={endDate} />
          </Suspense>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-brand-navy to-brand-purple text-white col-span-2 lg:col-span-1">
          <CardContent className="py-4 sm:py-5">
            <div className="text-xs sm:text-sm font-medium text-white/70">
              Total Prospects
            </div>
            <div className="mt-1 text-3xl sm:text-4xl font-bold">{data.totalProspects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 sm:py-5">
            <div className="text-xs sm:text-sm font-medium text-gray-500">Last 7 Days</div>
            <div className="mt-1 text-2xl sm:text-4xl font-bold text-brand-cyan">
              +{data.prospectsLast7Days}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 sm:py-5">
            <div className="text-xs sm:text-sm font-medium text-gray-500">
              Last 30 Days
            </div>
            <div className="mt-1 text-2xl sm:text-4xl font-bold text-brand-purple">
              +{data.prospectsLast30Days}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-brand-green/10 border-brand-green/30">
          <CardContent className="py-4 sm:py-5">
            <div className="text-xs sm:text-sm font-medium text-brand-green">Selected</div>
            <div className="mt-1 text-2xl sm:text-4xl font-bold text-brand-green">
              {data.selected}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 sm:py-5">
            <div className="text-xs sm:text-sm font-medium text-gray-500">Earl Chats</div>
            <div className="mt-1 text-2xl sm:text-4xl font-bold text-brand-orange">
              {data.chatConversations}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Traffic Analytics */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">
            Website Traffic
          </h2>
        </CardHeader>
        <CardContent>
          {/* Traffic Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-brand-light/50 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-brand-navy">
                {visitorData.totalVisitors}
              </div>
              <div className="text-xs text-gray-500">Unique Visitors</div>
            </div>
            <div className="text-center p-4 bg-brand-cyan/10 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-brand-cyan">
                {visitorData.totalSessions}
              </div>
              <div className="text-xs text-gray-500">Sessions</div>
            </div>
            <div className="text-center p-4 bg-brand-purple/10 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-brand-purple">
                {visitorData.totalPageViews}
              </div>
              <div className="text-xs text-gray-500">Page Views</div>
            </div>
            <div className="text-center p-4 bg-brand-green/10 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-brand-green">
                {visitorData.totalSessions > 0
                  ? Math.round((visitorData.conversionFunnel.formSubmits / visitorData.totalSessions) * 100)
                  : 0}%
              </div>
              <div className="text-xs text-gray-500">Conversion Rate</div>
            </div>
          </div>

          {/* Visitor Conversion Funnel */}
          <h3 className="text-sm font-medium text-gray-700 mb-3">Visitor Funnel</h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-6">
            <div className="flex-1">
              <div className="h-10 bg-brand-cyan rounded-lg flex items-center justify-center text-white font-medium text-sm">
                {visitorData.conversionFunnel.visits} Visits
              </div>
            </div>
            <div className="hidden sm:block text-gray-400">→</div>
            <div className="sm:hidden text-center text-gray-400 text-xs">↓</div>
            <div className="flex-1">
              <div
                className="h-10 bg-brand-purple rounded-lg flex items-center justify-center text-white font-medium text-sm"
                style={{
                  opacity: visitorData.conversionFunnel.visits > 0
                    ? 0.3 + (visitorData.conversionFunnel.earlChats / visitorData.conversionFunnel.visits) * 0.7
                    : 0.3
                }}
              >
                {visitorData.conversionFunnel.earlChats} Chats
              </div>
            </div>
            <div className="hidden sm:block text-gray-400">→</div>
            <div className="sm:hidden text-center text-gray-400 text-xs">↓</div>
            <div className="flex-1">
              <div
                className="h-10 bg-brand-green rounded-lg flex items-center justify-center text-white font-medium text-sm"
                style={{
                  opacity: visitorData.conversionFunnel.visits > 0
                    ? 0.3 + (visitorData.conversionFunnel.formSubmits / visitorData.conversionFunnel.visits) * 0.7
                    : 0.3
                }}
              >
                {visitorData.conversionFunnel.formSubmits} Converted
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Traffic Sources */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Traffic Sources</h3>
              {visitorData.trafficSources.length > 0 ? (
                <div className="space-y-2">
                  {visitorData.trafficSources.slice(0, 6).map((source, i) => {
                    const maxCount = Math.max(...visitorData.trafficSources.map(s => s.count));
                    const width = (source.count / maxCount) * 100;
                    return (
                      <div key={source.source} className="flex items-center gap-2">
                        <div className="w-20 sm:w-28 text-xs text-gray-600 truncate flex-shrink-0">{source.source}</div>
                        <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden min-w-[60px]">
                          <div
                            className={`h-full rounded ${i === 0 ? 'bg-brand-purple' : 'bg-brand-cyan'}`}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <div className="w-7 sm:w-8 text-xs text-right text-gray-600 flex-shrink-0">{source.count}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No traffic data yet</p>
              )}
            </div>

            {/* Top Pages */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Top Pages</h3>
              {visitorData.topPages.length > 0 ? (
                <div className="space-y-2">
                  {visitorData.topPages.slice(0, 6).map((page) => (
                    <div key={page.path} className="flex items-center justify-between py-1 border-b border-gray-100">
                      <span className="text-xs text-gray-600 truncate max-w-[140px]">
                        {page.path === "/" ? "Home" : page.path}
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-brand-navy">{page.views}</span>
                        {page.avgDuration > 0 && (
                          <span className="text-gray-400">({page.avgDuration}s avg)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No page data yet</p>
              )}
            </div>

            {/* Device Breakdown */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Devices</h3>
              {visitorData.deviceBreakdown.length > 0 ? (
                <div className="flex gap-2">
                  {visitorData.deviceBreakdown.map((device) => {
                    const total = visitorData.deviceBreakdown.reduce((sum, d) => sum + d.count, 0);
                    const percent = total > 0 ? Math.round((device.count / total) * 100) : 0;
                    const color = device.device === "desktop"
                      ? "bg-brand-navy"
                      : device.device === "mobile"
                      ? "bg-brand-cyan"
                      : "bg-brand-purple";
                    return (
                      <div key={device.device} className="flex-1 text-center">
                        <div className={`${color} text-white rounded-lg py-3 font-bold text-lg`}>
                          {percent}%
                        </div>
                        <div className="mt-1 text-xs text-gray-500 capitalize">{device.device}</div>
                        <div className="text-xs text-gray-400">{device.count}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No device data yet</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Event Analytics */}
      {customEventsData.eventsByType.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">
              User Engagement Events
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Event Type Breakdown */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Events by Type</h3>
                <div className="space-y-2">
                  {customEventsData.eventsByType.slice(0, 10).map((event) => {
                    const maxCount = Math.max(...customEventsData.eventsByType.map(e => e.count));
                    const width = (event.count / maxCount) * 100;
                    const eventLabel = event.type.replace(/_/g, " ").toLowerCase();
                    const icon = event.type.includes("VIDEO") ? "🎬"
                      : event.type.includes("DOWNLOAD") ? "📥"
                      : event.type.includes("FAQ") ? "❓"
                      : event.type.includes("SCROLL") ? "📜"
                      : event.type.includes("CTA") ? "🎯"
                      : event.type.includes("CHAT") ? "💬"
                      : "📊";
                    return (
                      <div key={event.type} className="flex items-center gap-2">
                        <span className="w-5 text-center">{icon}</span>
                        <div className="w-32 text-xs text-gray-600 truncate capitalize">{eventLabel}</div>
                        <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                          <div
                            className="h-full bg-brand-cyan rounded"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <div className="w-10 text-xs text-right text-gray-600 font-medium">{event.count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Most Engaged Pages */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Most Engaged Pages</h3>
                {customEventsData.topEventPages.length > 0 ? (
                  <div className="space-y-2">
                    {customEventsData.topEventPages.slice(0, 8).map((page) => (
                      <div key={page.path} className="flex items-center justify-between py-1 border-b border-gray-100">
                        <span className="text-xs text-gray-600 truncate max-w-[180px]">
                          {page.path === "/" ? "Home" : page.path}
                        </span>
                        <span className="font-medium text-brand-navy text-xs">{page.count} events</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No engagement data yet</p>
                )}
              </div>
            </div>

            {/* Recent Events Stream */}
            {customEventsData.recentEvents.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Events</h3>
                <div className="max-h-48 overflow-y-auto overflow-x-auto border rounded-lg">
                  <table className="w-full text-xs min-w-[400px]">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 sm:px-3 py-2 text-left text-gray-500 whitespace-nowrap">Time</th>
                        <th className="px-2 sm:px-3 py-2 text-left text-gray-500 whitespace-nowrap">Event</th>
                        <th className="px-2 sm:px-3 py-2 text-left text-gray-500 whitespace-nowrap hidden sm:table-cell">Page</th>
                        <th className="px-2 sm:px-3 py-2 text-left text-gray-500 whitespace-nowrap hidden md:table-cell">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {customEventsData.recentEvents.slice(0, 15).map((event) => (
                        <tr key={event.id} className="hover:bg-gray-50">
                          <td className="px-2 sm:px-3 py-2 text-gray-400 whitespace-nowrap">
                            {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-2 sm:px-3 py-2">
                            <span className="px-2 py-0.5 bg-brand-cyan/10 text-brand-cyan rounded text-xs whitespace-nowrap">
                              {event.eventName}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-2 text-gray-600 truncate max-w-[120px] hidden sm:table-cell">
                            {event.pagePath === "/" ? "Home" : event.pagePath}
                          </td>
                          <td className="px-2 sm:px-3 py-2 text-gray-500 truncate max-w-[150px] hidden md:table-cell">
                            {event.elementText || event.fileName || (event.scrollDepth ? `${event.scrollDepth}% scroll` : "-")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Visual Charts Section */}
      <AnalyticsCharts
        funnelData={data.funnel}
        timeSeriesData={timeSeriesData}
        timeInStageData={timeInStageData}
        cohortData={cohortData}
      />

      {/* Original Funnel (text-based) */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">
            Conversion Funnel (Detailed)
          </h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {data.funnel.map((step, index) => {
              const widthPercent =
                data.totalProspects > 0
                  ? Math.max((step.count / data.totalProspects) * 100, 5)
                  : 5;
              const isLast = index === data.funnel.length - 1;

              return (
                <div key={step.stage} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <div className="w-full sm:w-32 text-xs sm:text-sm text-gray-600 sm:text-right">
                    {STAGE_LABELS[step.stage]}
                  </div>
                  <div className="flex-1 relative">
                    <div
                      className={`h-6 sm:h-8 rounded transition-all ${
                        isLast ? "bg-brand-green" : "bg-brand-cyan"
                      }`}
                      style={{ width: `${widthPercent}%`, minWidth: '40px' }}
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-medium text-white">
                      {step.count}
                    </span>
                  </div>
                  <div className="w-full sm:w-24 text-xs sm:text-sm text-gray-500 flex gap-2">
                    {index > 0 && step.dropoff > 0 && (
                      <span className="text-red-500">-{step.dropoff}</span>
                    )}
                    <span className="text-slate-400">
                      {step.conversionRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
            <span>Rejected: {data.rejected}</span>
            <span>Withdrawn: {data.withdrawn}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pre-Work Progress */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">
              Pre-Work Status
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6">
              <div className="text-center p-2 sm:p-3 bg-gray-100 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-gray-400">
                  {data.preWorkStatus.notStarted}
                </div>
                <div className="text-xs text-gray-500">Not Started</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-brand-cyan/10 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-brand-cyan">
                  {data.preWorkStatus.inProgress}
                </div>
                <div className="text-xs text-gray-500">In Progress</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-brand-purple/10 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-brand-purple">
                  {data.preWorkStatus.submitted}
                </div>
                <div className="text-xs text-gray-500">Submitted</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-brand-green/10 rounded-lg">
                <div className="text-xl sm:text-2xl font-bold text-brand-green">
                  {data.preWorkStatus.approved}
                </div>
                <div className="text-xs text-gray-500">Approved</div>
              </div>
            </div>

            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Module Completion Rates
            </h3>
            <div className="space-y-3">
              {data.moduleStats.map((module) => (
                <div key={module.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{module.title}</span>
                    <span className="font-medium text-brand-navy">
                      {module.completed} ({module.rate}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-cyan rounded-full"
                      style={{ width: `${module.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Interest & Score */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">
              Prospect Quality
            </h2>
          </CardHeader>
          <CardContent>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Interest Level
            </h3>
            <div className="space-y-2 mb-6">
              {data.byInterest.map((interest) => {
                const percentage =
                  data.totalProspects > 0
                    ? Math.round((interest.count / data.totalProspects) * 100)
                    : 0;
                return (
                  <div key={interest.level} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-gray-600">
                      {interestLabels[interest.level]}
                    </div>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-purple rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-12 text-xs text-right text-gray-600">
                      {interest.count}
                    </div>
                  </div>
                );
              })}
            </div>

            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Score Distribution
            </h3>
            <div className="flex gap-2">
              {data.scoreDistribution.map((range) => (
                <div key={range.label} className="flex-1 text-center">
                  <div
                    className={`${range.color} text-white rounded-lg py-4 font-bold text-xl`}
                  >
                    {range.count}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">{range.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Territories */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">
              Top Territories
            </h2>
          </CardHeader>
          <CardContent>
            {data.topTerritories.length > 0 ? (
              <div className="space-y-2">
                {data.topTerritories.map(([territory, count], index) => (
                  <div
                    key={territory}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-brand-navy/10 text-brand-navy text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{territory}</span>
                    </div>
                    <span className="font-semibold text-brand-navy">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No territory data yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">
              Recent Activity
            </h2>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {data.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="w-2 h-2 mt-2 rounded-full bg-brand-cyan" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-700">
                        <Link
                          href={`/admin/prospects/${activity.prospectId}`}
                          className="font-medium text-brand-navy hover:underline"
                        >
                          {activity.prospect.firstName}{" "}
                          {activity.prospect.lastName}
                        </Link>{" "}
                        {activityLabels[activity.activityType] ||
                          activity.description}
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatTimeAgo(activity.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No recent activity.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </WideContainer>
  );
}
