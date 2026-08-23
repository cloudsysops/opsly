"use client";

import { formatDateTime } from "@/lib/utils";

interface PageView {
  id: string;
  pagePath: string;
  pageTitle: string | null;
  duration: number | null;
  enteredAt: Date;
}

interface Session {
  id: string;
  sessionId: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  referrerDomain: string | null;
  landingPage: string;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  hadEarlChat: boolean;
  submittedForm: boolean;
  startedAt: Date;
  totalDuration: number;
  pageViewCount: number;
  pageViews: PageView[];
}

interface Visitor {
  id: string;
  visitorId: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  totalSessions: number;
  totalPageViews: number;
  totalTimeOnSite: number;
  sessions: Session[];
}

interface VisitorTimelineProps {
  visitors: Visitor[];
}

// Icon components
function IconEarl() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
    </svg>
  );
}

function IconForm() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
    </svg>
  );
}

function IconPage() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
    </svg>
  );
}

function IconLocation() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  );
}

function IconDevice() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
    </svg>
  );
}

function IconCampaign() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"/>
    </svg>
  );
}

export function VisitorTimeline({ visitors }: VisitorTimelineProps) {
  if (visitors.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No visitor tracking data available</p>
        <p className="text-sm mt-1">Visitor data will appear once this prospect visits the site</p>
      </div>
    );
  }

  // Flatten all events into a single timeline
  const allEvents: {
    type: "session_start" | "page_view" | "earl_chat" | "form_submit";
    timestamp: Date;
    session: Session;
    pageView?: PageView;
    visitor: Visitor;
  }[] = [];

  for (const visitor of visitors) {
    for (const session of visitor.sessions) {
      // Session start
      allEvents.push({
        type: "session_start",
        timestamp: session.startedAt,
        session,
        visitor,
      });

      // Page views
      for (const pv of session.pageViews) {
        allEvents.push({
          type: "page_view",
          timestamp: pv.enteredAt,
          session,
          pageView: pv,
          visitor,
        });
      }

      // Earl chat (approximate - we know it happened but not exactly when)
      if (session.hadEarlChat) {
        allEvents.push({
          type: "earl_chat",
          timestamp: new Date(new Date(session.startedAt).getTime() + 60000), // Approx 1 min after session start
          session,
          visitor,
        });
      }

      // Form submit
      if (session.submittedForm) {
        allEvents.push({
          type: "form_submit",
          timestamp: new Date(new Date(session.startedAt).getTime() + session.totalDuration * 1000),
          session,
          visitor,
        });
      }
    }
  }

  // Sort by timestamp (newest first for display)
  allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Group events by date
  const eventsByDate = allEvents.reduce((acc, event) => {
    const dateKey = new Date(event.timestamp).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, typeof allEvents>);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 p-4 bg-gradient-to-r from-brand-navy/5 to-brand-purple/5 rounded-xl">
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-navy">
            {visitors[0]?.totalSessions || 0}
          </div>
          <div className="text-xs text-gray-500">Visits</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-purple">
            {visitors[0]?.totalPageViews || 0}
          </div>
          <div className="text-xs text-gray-500">Pages</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-cyan">
            {Math.round((visitors[0]?.totalTimeOnSite || 0) / 60)}m
          </div>
          <div className="text-xs text-gray-500">Time</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-green">
            {formatDateTime(visitors[0]?.firstSeenAt || new Date()).split(",")[0]}
          </div>
          <div className="text-xs text-gray-500">First Visit</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-purple via-brand-cyan to-brand-green" />

        {Object.entries(eventsByDate).map(([date, events]) => (
          <div key={date} className="mb-6">
            {/* Date header */}
            <div className="relative flex items-center mb-3">
              <div className="absolute left-2 w-5 h-5 bg-white border-2 border-brand-navy rounded-full z-10" />
              <div className="ml-10 text-sm font-semibold text-brand-navy">{date}</div>
            </div>

            {/* Events for this date */}
            <div className="space-y-2">
              {events.map((event, i) => (
                <div key={`${event.type}-${i}`} className="relative flex items-start">
                  {/* Event dot */}
                  <div className={`absolute left-3 w-3 h-3 rounded-full z-10 ${
                    event.type === "session_start" ? "bg-brand-purple" :
                    event.type === "earl_chat" ? "bg-brand-cyan" :
                    event.type === "form_submit" ? "bg-brand-green" :
                    "bg-gray-300"
                  }`} />

                  {/* Event content */}
                  <div className="ml-10 flex-1 min-w-0">
                    {event.type === "session_start" && (
                      <div className="p-3 bg-brand-purple/5 rounded-lg border border-brand-purple/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-brand-purple">
                            Started Session
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDateTime(event.timestamp).split(",")[1]?.trim()}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {event.session.utmSource && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-purple/10 text-brand-purple rounded-full">
                              <IconCampaign />
                              {event.session.utmSource}
                              {event.session.utmCampaign && ` / ${event.session.utmCampaign}`}
                            </span>
                          )}
                          {event.session.referrerDomain && !event.session.utmSource && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                              via {event.session.referrerDomain}
                            </span>
                          )}
                          {event.session.deviceType && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                              <IconDevice />
                              {event.session.deviceType}
                            </span>
                          )}
                          {event.session.city && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                              <IconLocation />
                              {event.session.city}, {event.session.region}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {event.type === "page_view" && event.pageView && (
                      <div className="flex items-center gap-2 py-1">
                        <IconPage />
                        <span className="text-sm text-gray-600">
                          {event.pageView.pagePath === "/" ? "Home" : event.pageView.pagePath}
                        </span>
                        {event.pageView.duration && event.pageView.duration > 0 && (
                          <span className="text-xs text-gray-400">
                            ({event.pageView.duration}s)
                          </span>
                        )}
                        <span className="text-xs text-gray-300 ml-auto">
                          {formatDateTime(event.timestamp).split(",")[1]?.trim()}
                        </span>
                      </div>
                    )}

                    {event.type === "earl_chat" && (
                      <div className="p-2 bg-brand-cyan/10 rounded-lg border border-brand-cyan/20">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-brand-cyan/20 rounded-full flex items-center justify-center text-brand-cyan">
                            <IconEarl />
                          </div>
                          <span className="text-sm font-medium text-brand-cyan">
                            Chatted with Earl
                          </span>
                        </div>
                      </div>
                    )}

                    {event.type === "form_submit" && (
                      <div className="p-2 bg-brand-green/10 rounded-lg border border-brand-green/20">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-brand-green/20 rounded-full flex items-center justify-center text-brand-green">
                            <IconForm />
                          </div>
                          <span className="text-sm font-medium text-brand-green">
                            ✓ Submitted Contact Form
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
