import { db } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

export const dynamic = 'force-dynamic';

async function getSessionReplays() {
  const replays = await db.sessionReplay.findMany({
    orderBy: { startedAt: "desc" },
    take: 100,
  });

  // Get visitor/prospect info for each replay
  const visitorIds = [...new Set(replays.map((r) => r.visitorId))];
  const visitors = await db.visitor.findMany({
    where: {
      visitorId: { in: visitorIds },
    },
    include: {
      prospect: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  const visitorMap = new Map(visitors.map((v) => [v.visitorId, v]));

  return replays.map((replay) => ({
    ...replay,
    visitor: visitorMap.get(replay.visitorId),
  }));
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export default async function SessionReplaysPage() {
  const replays = await getSessionReplays();

  // Group replays by date
  const replaysByDate = replays.reduce((acc, replay) => {
    const date = new Date(replay.startedAt).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(replay);
    return acc;
  }, {} as Record<string, typeof replays>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">Session Replays</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Watch how visitors interact with your site
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="py-3 sm:py-4">
            <div className="text-xs sm:text-sm text-gray-500">Total Recordings</div>
            <div className="text-2xl sm:text-3xl font-bold text-brand-navy">{replays.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-brand-cyan/10 border-brand-cyan/30">
          <CardContent className="py-3 sm:py-4">
            <div className="text-xs sm:text-sm text-brand-cyan">Completed</div>
            <div className="text-2xl sm:text-3xl font-bold text-brand-cyan">
              {replays.filter((r) => r.isComplete).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 sm:py-4">
            <div className="text-xs sm:text-sm text-gray-500">Avg Duration</div>
            <div className="text-2xl sm:text-3xl font-bold text-brand-purple">
              {replays.length > 0
                ? formatDuration(Math.round(replays.reduce((sum, r) => sum + r.duration, 0) / replays.length))
                : "0s"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 sm:py-4">
            <div className="text-xs sm:text-sm text-gray-500">Total Events</div>
            <div className="text-2xl sm:text-3xl font-bold text-brand-orange">
              {replays.reduce((sum, r) => sum + r.eventCount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Replays List */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">Recent Recordings</h2>
        </CardHeader>
        <CardContent className="p-0">
          {replays.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {Object.entries(replaysByDate).map(([date, dateReplays]) => (
                <div key={date}>
                  {/* Date header */}
                  <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700">
                    {date}
                  </div>

                  {/* Replays for this date */}
                  {dateReplays.map((replay) => (
                    <Link
                      key={replay.id}
                      href={`/admin/replays/${replay.id}`}
                      className="block p-3 sm:p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Visitor info */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${replay.isComplete ? "bg-brand-green" : "bg-brand-orange"}`} />
                            {replay.visitor?.prospect ? (
                              <span className="font-medium text-brand-navy text-sm sm:text-base">
                                {replay.visitor.prospect.firstName} {replay.visitor.prospect.lastName}
                              </span>
                            ) : (
                              <span className="text-gray-600 text-sm sm:text-base">Anonymous Visitor</span>
                            )}
                            <span className="text-xs text-gray-400 hidden sm:inline">
                              {replay.visitorId.slice(0, 8)}...
                            </span>
                          </div>

                          {/* Page and stats */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                            <span className="truncate max-w-[150px] sm:max-w-[200px]">
                              {replay.pagePath === "/" ? "Home" : replay.pagePath}
                            </span>
                            <span>
                              {formatDuration(replay.duration)}
                            </span>
                            <span className="hidden sm:inline">
                              {replay.eventCount.toLocaleString()} events
                            </span>
                            {replay.viewportWidth && (
                              <span className="text-gray-400 hidden md:inline">
                                {replay.viewportWidth}x{replay.viewportHeight}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Time and play button */}
                        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                          <div className="text-xs sm:text-sm text-gray-400">
                            {new Date(replay.startedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-brand-navy/10 flex items-center justify-center text-brand-navy">
                            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🎬</div>
              <p className="mb-2">No session recordings yet</p>
              <p className="text-sm">
                Recordings will appear here once visitors interact with your site
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="bg-brand-light/30 border-brand-cyan/20">
        <CardContent className="py-6">
          <h3 className="font-semibold text-brand-navy mb-3">🎬 How Session Replay Works</h3>
          <div className="grid gap-4 sm:grid-cols-3 text-sm text-gray-600">
            <div>
              <strong className="text-brand-navy">Recording</strong>
              <p className="mt-1">
                Mouse movements, clicks, and scrolls are captured as visitors browse your site.
              </p>
            </div>
            <div>
              <strong className="text-brand-navy">Privacy</strong>
              <p className="mt-1">
                No personal data, form inputs, or sensitive content is recorded - only interaction patterns.
              </p>
            </div>
            <div>
              <strong className="text-brand-navy">Insights</strong>
              <p className="mt-1">
                Watch how visitors navigate to understand friction points and optimize conversion.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
