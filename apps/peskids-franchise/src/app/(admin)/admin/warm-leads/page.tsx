import { db } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { formatDate, formatDateTime } from "@/lib/utils";
import { SortSelect } from "@/components/admin/SortSelect";

export const dynamic = 'force-dynamic';

interface SearchParams {
  sort?: string;
}

async function getWarmLeads(sortBy: string = "engagement") {
  // Get all visitors without a linked prospect (anonymous)
  const visitors = await db.visitor.findMany({
    where: {
      prospectId: null,
    },
    include: {
      sessions: {
        orderBy: { startedAt: "desc" },
        take: 3,
        include: {
          pageViews: {
            take: 5,
            orderBy: { enteredAt: "desc" },
          },
        },
      },
    },
  });

  // Calculate engagement score for each visitor
  const scoredVisitors = visitors.map((visitor) => {
    let score = 0;

    // Sessions (return visits are valuable)
    score += (visitor.totalSessions - 1) * 15;

    // Page views
    score += Math.min(visitor.totalPageViews, 30) * 2;

    // Time on site (up to 20 minutes)
    const minutes = Math.min(visitor.totalTimeOnSite / 60, 20);
    score += minutes * 3;

    // Earl chat
    const hadEarlChat = visitor.sessions.some((s) => s.hadEarlChat);
    if (hadEarlChat) score += 25;

    // High-value pages
    const highValuePages = ["/investment", "/contact", "/business-model", "/territory"];
    const viewedHighValue = visitor.sessions.some((s) =>
      s.pageViews.some((pv) =>
        highValuePages.some((hvp) => pv.pagePath.startsWith(hvp))
      )
    );
    if (viewedHighValue) score += 20;

    // Recent activity bonus
    const daysSinceLastSeen = (Date.now() - new Date(visitor.lastSeenAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastSeen < 1) score += 20;
    else if (daysSinceLastSeen < 3) score += 10;
    else if (daysSinceLastSeen < 7) score += 5;

    return {
      ...visitor,
      engagementScore: Math.round(score),
      hadEarlChat,
      viewedHighValue,
      latestSession: visitor.sessions[0],
    };
  });

  // Filter out very low engagement visitors
  const warmLeads = scoredVisitors.filter((v) => v.engagementScore >= 20);

  // Sort
  if (sortBy === "recent") {
    warmLeads.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
  } else if (sortBy === "sessions") {
    warmLeads.sort((a, b) => b.totalSessions - a.totalSessions);
  } else {
    warmLeads.sort((a, b) => b.engagementScore - a.engagementScore);
  }

  return warmLeads;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-brand-green text-white";
  if (score >= 50) return "bg-brand-cyan text-white";
  if (score >= 30) return "bg-brand-purple/20 text-brand-purple";
  return "bg-gray-100 text-gray-600";
}

function getTimeAgo(date: Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 5) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export default async function WarmLeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const sortBy = params.sort || "engagement";
  const warmLeads = await getWarmLeads(sortBy);

  const sortOptions = [
    { value: "engagement", label: "Engagement Score" },
    { value: "recent", label: "Most Recent" },
    { value: "sessions", label: "Most Sessions" },
  ];

  return (
    <WideContainer className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">Warm Leads</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Anonymous visitors showing strong interest but haven&apos;t converted yet
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sort by:</span>
          <SortSelect options={sortOptions} defaultValue={sortBy} />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-gray-500">Total Warm Leads</div>
            <div className="text-3xl font-bold text-brand-navy">{warmLeads.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-brand-green/10 border-brand-green/30">
          <CardContent className="py-4">
            <div className="text-sm text-brand-green">Hot (80+ score)</div>
            <div className="text-3xl font-bold text-brand-green">
              {warmLeads.filter((l) => l.engagementScore >= 80).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-gray-500">Active Today</div>
            <div className="text-3xl font-bold text-brand-cyan">
              {warmLeads.filter((l) => {
                const hoursSince = (Date.now() - new Date(l.lastSeenAt).getTime()) / 3600000;
                return hoursSince < 24;
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-gray-500">Chatted with Earl</div>
            <div className="text-3xl font-bold text-brand-purple">
              {warmLeads.filter((l) => l.hadEarlChat).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warm Leads List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-navy">Anonymous Visitors</h2>
            <span className="text-sm text-gray-500">
              Showing {warmLeads.length} leads with engagement score 20+
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {warmLeads.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {warmLeads.map((lead) => (
                <div key={lead.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(lead.engagementScore)}`}>
                          {lead.engagementScore}
                        </span>
                        <span className="text-sm text-gray-500">
                          {lead.totalSessions} visit{lead.totalSessions !== 1 ? "s" : ""} • {lead.totalPageViews} pages • {Math.round(lead.totalTimeOnSite / 60)}m total
                        </span>
                      </div>

                      {/* Signals */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {lead.hadEarlChat && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-brand-cyan/10 text-brand-cyan">
                            💬 Chatted with Earl
                          </span>
                        )}
                        {lead.viewedHighValue && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-brand-purple/10 text-brand-purple">
                            🎯 Viewed Investment/Contact
                          </span>
                        )}
                        {lead.totalSessions >= 3 && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-brand-orange/10 text-brand-orange">
                            🔄 {lead.totalSessions}x Return Visitor
                          </span>
                        )}
                        {lead.latestSession?.utmSource && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            📣 {lead.latestSession.utmSource}
                          </span>
                        )}
                        {lead.latestSession?.city && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            📍 {lead.latestSession.city}, {lead.latestSession.region}
                          </span>
                        )}
                      </div>

                      {/* Recent Pages */}
                      {lead.latestSession?.pageViews && lead.latestSession.pageViews.length > 0 && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">Recent pages:</span>{" "}
                          {lead.latestSession.pageViews
                            .slice(0, 4)
                            .map((pv) => (pv.pagePath === "/" ? "Home" : pv.pagePath))
                            .join(" → ")}
                        </div>
                      )}
                    </div>

                    {/* Right Side */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-sm font-medium text-gray-600">
                        {getTimeAgo(lead.lastSeenAt)}
                      </div>
                      <div className="text-xs text-gray-400">
                        First seen: {formatDate(lead.firstSeenAt)}
                      </div>
                      {lead.latestSession?.deviceType && (
                        <div className="text-xs text-gray-400">
                          {lead.latestSession.deviceType} • {lead.latestSession.browser}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">No warm leads yet</p>
              <p className="text-sm">
                Visitors will appear here once they show engagement signals (multiple visits, Earl chat, etc.)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-brand-light/30 border-brand-cyan/20">
        <CardContent className="py-6">
          <h3 className="font-semibold text-brand-navy mb-3">💡 How Engagement Score Works</h3>
          <div className="grid gap-2 sm:grid-cols-2 text-sm text-gray-600">
            <div>
              <strong>High Value Actions:</strong>
              <ul className="mt-1 list-disc list-inside">
                <li>Chatted with Earl: +25 points</li>
                <li>Viewed Investment/Contact: +20 points</li>
                <li>Return visits: +15 per visit</li>
              </ul>
            </div>
            <div>
              <strong>Engagement Signals:</strong>
              <ul className="mt-1 list-disc list-inside">
                <li>Page views: +2 per page (max 30)</li>
                <li>Time on site: +3 per minute (max 20min)</li>
                <li>Active today: +20 bonus</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </WideContainer>
  );
}
