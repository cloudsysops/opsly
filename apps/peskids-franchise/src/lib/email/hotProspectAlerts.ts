import { db } from "@/lib/db";
const ADMIN_EMAILS = [
  "franchising@acmefranchise.com",
  "admin@acmefranchise.com",
];

interface HotProspectAlert {
  type: "repeat_visitor" | "high_engagement" | "new_territory" | "active_now";
  visitorId: string;
  sessionId: string;
  details: Record<string, unknown>;
}

/**
 * Check if we should send a hot prospect alert
 * Returns alert details if alert should be sent, null otherwise
 */
export async function checkHotProspectTriggers(
  visitorId: string,
  sessionId: string
): Promise<HotProspectAlert | null> {
  const visitor = await db.visitor.findUnique({
    where: { visitorId },
    include: {
      sessions: {
        orderBy: { startedAt: "desc" },
        take: 5,
        include: {
          pageViews: true,
        },
      },
      prospect: true,
    },
  });

  if (!visitor) return null;

  // Don't alert for already-converted visitors
  if (visitor.prospectId) return null;

  const currentSession = visitor.sessions.find((s) => s.sessionId === sessionId);
  if (!currentSession) return null;

  // Check for repeat visitor (3+ sessions without converting)
  if (visitor.totalSessions >= 3) {
    // Check if we already sent this alert recently
    const recentAlert = await db.notificationLog.findFirst({
      where: {
        type: "HIGH_SCORE_ALERT",
        metadata: {
          path: ["visitorId"],
          equals: visitorId,
        },
        sentAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (!recentAlert) {
      return {
        type: "repeat_visitor",
        visitorId,
        sessionId,
        details: {
          totalSessions: visitor.totalSessions,
          totalPageViews: visitor.totalPageViews,
          totalTimeOnSite: visitor.totalTimeOnSite,
          firstSeenAt: visitor.firstSeenAt,
        },
      };
    }
  }

  // Check for high engagement in current session
  const highValuePages = ["/investment", "/contact", "/business-model", "/territory"];
  const viewedHighValue = currentSession.pageViews.some((pv) =>
    highValuePages.some((hvp) => pv.pagePath.startsWith(hvp))
  );
  const hadEarlChat = currentSession.hadEarlChat;

  if (viewedHighValue && hadEarlChat && currentSession.pageViewCount >= 5) {
    return {
      type: "high_engagement",
      visitorId,
      sessionId,
      details: {
        pageViews: currentSession.pageViewCount,
        hadEarlChat: true,
        viewedPages: currentSession.pageViews.map((pv) => pv.pagePath),
        sessionDuration: currentSession.totalDuration,
      },
    };
  }

  // Check for new territory (if we have geo data)
  if (currentSession.region && currentSession.city) {
    const existingFromRegion = await db.visitorSession.count({
      where: {
        region: currentSession.region,
        id: { not: currentSession.id },
      },
    });

    if (existingFromRegion === 0) {
      return {
        type: "new_territory",
        visitorId,
        sessionId,
        details: {
          city: currentSession.city,
          region: currentSession.region,
          country: currentSession.country,
        },
      };
    }
  }

  return null;
}

/**
 * Log hot prospect alert for daily digest (no longer sends individual emails)
 */
export async function logHotProspectAlert(alert: HotProspectAlert): Promise<void> {
  let subject = "";

  switch (alert.type) {
    case "repeat_visitor":
      subject = "Hot Lead: Repeat Visitor (3+ times)";
      break;
    case "high_engagement":
      subject = "Highly Engaged Visitor";
      break;
    case "new_territory":
      subject = `First Visitor from ${alert.details.city}, ${alert.details.region}`;
      break;
    default:
      return;
  }

  try {
    await db.notificationLog.create({
      data: {
        type: "HIGH_SCORE_ALERT",
        recipientEmail: ADMIN_EMAILS.join(", "),
        subject,
        metadata: {
          alertType: alert.type,
          visitorId: alert.visitorId,
          sessionId: alert.sessionId,
          details: alert.details,
        } as any,
      },
    });

    console.log(`Logged hot prospect alert for digest: ${alert.type}`);
  } catch (error) {
    console.error("Failed to log hot prospect alert:", error);
  }
}

/**
 * Check and log hot prospect alerts for daily digest
 * Called from tracking API on significant events
 */
export async function checkAndSendHotProspectAlert(
  visitorId: string,
  sessionId: string
): Promise<void> {
  try {
    const alert = await checkHotProspectTriggers(visitorId, sessionId);
    if (alert) {
      await logHotProspectAlert(alert);
    }
  } catch (error) {
    console.error("Error checking hot prospect triggers:", error);
  }
}
