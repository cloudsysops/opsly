import { db } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/utils";
import { SessionReplayPlayer } from "@/components/admin/SessionReplayPlayer";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getReplayWithContext(id: string) {
  const replay = await db.sessionReplay.findUnique({
    where: { id },
  });

  if (!replay) return null;

  // Get visitor and prospect info
  const visitor = await db.visitor.findUnique({
    where: { visitorId: replay.visitorId },
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

  // Get session info
  const session = await db.visitorSession.findUnique({
    where: { sessionId: replay.sessionId },
    include: {
      pageViews: {
        orderBy: { enteredAt: "asc" },
      },
    },
  });

  return {
    replay,
    visitor,
    session,
  };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export default async function ReplayDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getReplayWithContext(id);

  if (!data) {
    notFound();
  }

  const { replay, visitor, session } = data;
  const events = (replay.events as any[]) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/admin/replays"
              className="text-gray-400 hover:text-brand-navy transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">Session Replay</h1>
          </div>

          {/* Visitor info */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {visitor?.prospect ? (
              <Link
                href={`/admin/prospects/${visitor.prospect.id}`}
                className="font-medium text-brand-cyan hover:underline"
              >
                {visitor.prospect.firstName} {visitor.prospect.lastName}
              </Link>
            ) : (
              <span>Anonymous Visitor</span>
            )}
            <span className="text-gray-400">|</span>
            <span>{formatDateTime(replay.startedAt)}</span>
            <span className="text-gray-400">|</span>
            <span>{formatDuration(replay.duration)}</span>
          </div>
        </div>

        {/* Status badge */}
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          replay.isComplete
            ? "bg-brand-green/10 text-brand-green"
            : "bg-brand-orange/10 text-brand-orange"
        }`}>
          {replay.isComplete ? "Complete" : "In Progress"}
        </div>
      </div>

      {/* Player */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-navy">
              Playback - {replay.pagePath === "/" ? "Home Page" : replay.pagePath}
            </h2>
            <div className="text-sm text-gray-500">
              {events.length.toLocaleString()} events recorded
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <SessionReplayPlayer
              events={events}
              viewportWidth={replay.viewportWidth || 1280}
              viewportHeight={replay.viewportHeight || 800}
              pageUrl={replay.pagePath}
              duration={replay.duration}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No events recorded for this session</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Session Info */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">Session Details</h2>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Started</dt>
                <dd className="font-medium">{formatDateTime(replay.startedAt)}</dd>
              </div>
              {replay.endedAt && (
                <div>
                  <dt className="text-gray-500">Ended</dt>
                  <dd className="font-medium">{formatDateTime(replay.endedAt)}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Duration</dt>
                <dd className="font-medium">{formatDuration(replay.duration)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Events</dt>
                <dd className="font-medium">{events.length.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Viewport</dt>
                <dd className="font-medium">
                  {replay.viewportWidth}x{replay.viewportHeight}
                </dd>
              </div>
              {replay.pageWidth && (
                <div>
                  <dt className="text-gray-500">Page Size</dt>
                  <dd className="font-medium">
                    {replay.pageWidth}x{replay.pageHeight}
                  </dd>
                </div>
              )}
              {session?.utmSource && (
                <div>
                  <dt className="text-gray-500">Traffic Source</dt>
                  <dd className="font-medium text-brand-purple">
                    {session.utmSource}
                    {session.utmCampaign && ` / ${session.utmCampaign}`}
                  </dd>
                </div>
              )}
              {session?.deviceType && (
                <div>
                  <dt className="text-gray-500">Device</dt>
                  <dd className="font-medium capitalize">{session.deviceType}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Event Breakdown */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">Event Breakdown</h2>
          </CardHeader>
          <CardContent>
            {events.length > 0 ? (
              <div className="space-y-3">
                {/* rrweb event types: 0=DomContentLoaded, 1=Load, 2=FullSnapshot, 3=IncrementalSnapshot, 4=Meta, 5=Custom */}
                {[
                  { type: 2, label: "Full Snapshot", icon: "📸", color: "bg-brand-purple" },
                  { type: 3, label: "DOM Changes", icon: "🔄", color: "bg-brand-cyan" },
                  { type: 4, label: "Metadata", icon: "📋", color: "bg-brand-orange" },
                ].map(({ type, label, icon, color }) => {
                  const count = events.filter((e) => e.type === type).length;
                  const percent = events.length > 0 ? (count / events.length) * 100 : 0;

                  if (count === 0) return null;

                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="flex items-center gap-2">
                          <span>{icon}</span>
                          <span className="text-gray-700">{label}</span>
                        </span>
                        <span className="font-medium text-brand-navy">
                          {count.toLocaleString()} ({Math.round(percent)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Total events summary */}
                <div className="pt-4 border-t mt-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{events.length.toLocaleString()}</span> total events recorded
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No events to analyze</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Page Views Timeline */}
      {session?.pageViews && session.pageViews.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">Page Views During Session</h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {session.pageViews.map((pv, i) => (
                <div key={pv.id} className="flex items-center">
                  <div className="px-3 py-2 bg-brand-navy/10 rounded-lg text-sm whitespace-nowrap">
                    <div className="font-medium text-brand-navy">
                      {pv.pagePath === "/" ? "Home" : pv.pagePath}
                    </div>
                    {pv.duration && (
                      <div className="text-xs text-gray-500">{pv.duration}s</div>
                    )}
                  </div>
                  {i < session.pageViews.length - 1 && (
                    <svg className="w-4 h-4 text-gray-300 mx-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
