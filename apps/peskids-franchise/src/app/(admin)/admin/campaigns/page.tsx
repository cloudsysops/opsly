import { db } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import { UTMBuilder } from "@/components/admin/UTMBuilder";
import { formatDate } from "@/lib/utils";

export const dynamic = 'force-dynamic';

interface SearchParams {
  start?: string;
  end?: string;
}

async function getCampaignData(dateRange: { start: Date; end: Date }) {
  // Get all sessions with UTM data
  const sessionsWithUTM = await db.visitorSession.findMany({
    where: {
      startedAt: { gte: dateRange.start, lte: dateRange.end },
      utmSource: { not: null },
    },
    select: {
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      utmContent: true,
      hadEarlChat: true,
      submittedForm: true,
      totalDuration: true,
      pageViewCount: true,
    },
  });

  // Group by campaign
  const campaignMap = new Map<string, {
    source: string;
    medium: string | null;
    campaign: string | null;
    sessions: number;
    earlChats: number;
    conversions: number;
    totalDuration: number;
    totalPageViews: number;
  }>();

  for (const session of sessionsWithUTM) {
    const key = `${session.utmSource}|${session.utmMedium || ""}|${session.utmCampaign || ""}`;

    const existing = campaignMap.get(key);
    if (existing) {
      existing.sessions++;
      if (session.hadEarlChat) existing.earlChats++;
      if (session.submittedForm) existing.conversions++;
      existing.totalDuration += session.totalDuration;
      existing.totalPageViews += session.pageViewCount;
    } else {
      campaignMap.set(key, {
        source: session.utmSource!,
        medium: session.utmMedium,
        campaign: session.utmCampaign,
        sessions: 1,
        earlChats: session.hadEarlChat ? 1 : 0,
        conversions: session.submittedForm ? 1 : 0,
        totalDuration: session.totalDuration,
        totalPageViews: session.pageViewCount,
      });
    }
  }

  // Convert to array and sort by sessions
  const campaigns = Array.from(campaignMap.values())
    .map((c) => ({
      ...c,
      avgDuration: c.sessions > 0 ? Math.round(c.totalDuration / c.sessions) : 0,
      avgPageViews: c.sessions > 0 ? (c.totalPageViews / c.sessions).toFixed(1) : "0",
      chatRate: c.sessions > 0 ? Math.round((c.earlChats / c.sessions) * 100) : 0,
      conversionRate: c.sessions > 0 ? ((c.conversions / c.sessions) * 100).toFixed(1) : "0",
    }))
    .sort((a, b) => b.sessions - a.sessions);

  // Get top performing content variants
  const contentVariants = await db.visitorSession.groupBy({
    by: ["utmContent"],
    where: {
      startedAt: { gte: dateRange.start, lte: dateRange.end },
      utmContent: { not: null },
    },
    _count: true,
    _sum: { totalDuration: true },
  });

  // Totals
  const totals = {
    sessions: sessionsWithUTM.length,
    earlChats: sessionsWithUTM.filter((s) => s.hadEarlChat).length,
    conversions: sessionsWithUTM.filter((s) => s.submittedForm).length,
  };

  return { campaigns, contentVariants, totals };
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // Default to last 30 days
  const now = new Date();
  const defaultEnd = now.toISOString().split("T")[0];
  const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const dateRange = {
    start: new Date(params.start || defaultStart),
    end: new Date((params.end || defaultEnd) + "T23:59:59.999Z"),
  };

  const { campaigns, totals } = await getCampaignData(dateRange);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">Campaigns</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Track ad performance and generate UTM links
          </p>
        </div>
      </div>

      {/* UTM Builder */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">UTM Link Builder</h2>
        </CardHeader>
        <CardContent>
          <UTMBuilder />
        </CardContent>
      </Card>

      {/* Campaign Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-gray-500">Paid Sessions</div>
            <div className="text-3xl font-bold text-brand-navy">{totals.sessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-gray-500">Earl Chats</div>
            <div className="text-3xl font-bold text-brand-purple">{totals.earlChats}</div>
            <div className="text-sm text-gray-400">
              {totals.sessions > 0 ? Math.round((totals.earlChats / totals.sessions) * 100) : 0}% rate
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-sm text-gray-500">Conversions</div>
            <div className="text-3xl font-bold text-brand-green">{totals.conversions}</div>
            <div className="text-sm text-gray-400">
              {totals.sessions > 0 ? ((totals.conversions / totals.sessions) * 100).toFixed(1) : 0}% rate
            </div>
          </CardContent>
        </Card>
        <Card className="bg-brand-light/50">
          <CardContent className="py-4">
            <div className="text-sm text-gray-500">Cost Per Lead</div>
            <div className="text-2xl font-bold text-brand-navy">
              Coming Soon
            </div>
            <div className="text-xs text-gray-400">Add ad spend to calculate</div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance Table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">Campaign Performance</h2>
          <p className="text-sm text-gray-500">
            {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
          </p>
        </CardHeader>
        <CardContent>
          {campaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                      Source / Campaign
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                      Sessions
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                      Avg Pages
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                      Avg Time
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                      Chat Rate
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                      Conversions
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                      Conv. Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaigns.map((campaign, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-brand-navy">{campaign.source}</div>
                        <div className="text-sm text-gray-500">
                          {campaign.medium && <span>{campaign.medium}</span>}
                          {campaign.campaign && (
                            <span className="ml-2 text-brand-purple">
                              / {campaign.campaign}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{campaign.sessions}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{campaign.avgPageViews}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {Math.floor(campaign.avgDuration / 60)}m {campaign.avgDuration % 60}s
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${campaign.chatRate >= 20 ? 'text-brand-green' : 'text-gray-600'}`}>
                          {campaign.chatRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-brand-green">
                        {campaign.conversions}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${parseFloat(campaign.conversionRate) >= 5 ? 'text-brand-green' : 'text-gray-600'}`}>
                          {campaign.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No campaign data yet</p>
              <p className="text-sm">Use the UTM builder above to create tracked links for your ads</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="bg-brand-light/30 border-brand-cyan/20">
        <CardContent className="py-6">
          <h3 className="font-semibold text-brand-navy mb-3">💡 Campaign Tracking Tips</h3>
          <div className="grid gap-4 sm:grid-cols-2 text-sm text-gray-600">
            <div>
              <strong>For Facebook Ads:</strong>
              <ul className="mt-1 list-disc list-inside">
                <li>Source: facebook</li>
                <li>Medium: cpc or social</li>
                <li>Campaign: your_campaign_name</li>
              </ul>
            </div>
            <div>
              <strong>For Google Ads:</strong>
              <ul className="mt-1 list-disc list-inside">
                <li>Source: google</li>
                <li>Medium: cpc</li>
                <li>Campaign: search_brand or display_retarget</li>
              </ul>
            </div>
            <div>
              <strong>For Instagram:</strong>
              <ul className="mt-1 list-disc list-inside">
                <li>Source: instagram</li>
                <li>Medium: social or story</li>
                <li>Content: ad variant (headline_a, image_b)</li>
              </ul>
            </div>
            <div>
              <strong>For Email:</strong>
              <ul className="mt-1 list-disc list-inside">
                <li>Source: newsletter or email</li>
                <li>Medium: email</li>
                <li>Campaign: monthly_jan_2026</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
