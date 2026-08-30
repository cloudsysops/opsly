import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { lookupIpLocation } from "@/lib/geo/ipLookup";
import { checkAndSendHotProspectAlert } from "@/lib/email/hotProspectAlerts";

export const dynamic = "force-dynamic";

// Schema for different event types
const baseEventSchema = z.object({
  visitorId: z.string(),
  sessionId: z.string(),
  timestamp: z.string().optional(),
});

const sessionStartSchema = baseEventSchema.extend({
  event: z.literal("session_start"),
  data: z.object({
    // UTM params
    utmSource: z.string().nullable().optional(),
    utmMedium: z.string().nullable().optional(),
    utmCampaign: z.string().nullable().optional(),
    utmTerm: z.string().nullable().optional(),
    utmContent: z.string().nullable().optional(),
    // Traffic source
    referrer: z.string().nullable().optional(),
    referrerDomain: z.string().nullable().optional(),
    landingPage: z.string(),
    // Device info
    deviceType: z.string().nullable().optional(),
    browser: z.string().nullable().optional(),
    browserVersion: z.string().nullable().optional(),
    os: z.string().nullable().optional(),
    osVersion: z.string().nullable().optional(),
    screenWidth: z.number().nullable().optional(),
    screenHeight: z.number().nullable().optional(),
    language: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
  }),
});

const pageViewSchema = baseEventSchema.extend({
  event: z.literal("page_view"),
  data: z.object({
    pagePath: z.string(),
    pageTitle: z.string().nullable().optional(),
    pageType: z.string().nullable().optional(),
    previousPage: z.string().nullable().optional(),
  }),
});

const pageExitSchema = baseEventSchema.extend({
  event: z.literal("page_exit"),
  data: z.object({
    pagePath: z.string(),
    duration: z.number(), // seconds
    scrollDepth: z.number().nullable().optional(),
  }),
});

const heartbeatSchema = baseEventSchema.extend({
  event: z.literal("heartbeat"),
  data: z.object({
    currentPage: z.string(),
    sessionDuration: z.number(), // total seconds
  }),
});

const earlChatSchema = baseEventSchema.extend({
  event: z.literal("earl_chat"),
});

const formSubmitSchema = baseEventSchema.extend({
  event: z.literal("form_submit"),
  data: z.object({
    formType: z.string(), // "contact", etc.
  }),
});

const customEventSchema = baseEventSchema.extend({
  event: z.literal("custom_event"),
  data: z.object({
    eventType: z.string(),
    eventName: z.string(),
    eventCategory: z.string().optional(),
    pagePath: z.string(),
    elementId: z.string().optional(),
    elementText: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    // For scroll tracking
    scrollDepth: z.number().optional(),
    // For video/media tracking
    mediaUrl: z.string().optional(),
    mediaDuration: z.number().optional(),
    mediaPosition: z.number().optional(),
    // For download tracking
    fileName: z.string().optional(),
    fileType: z.string().optional(),
  }),
});

const eventSchema = z.discriminatedUnion("event", [
  sessionStartSchema,
  pageViewSchema,
  pageExitSchema,
  heartbeatSchema,
  earlChatSchema,
  formSubmitSchema,
  customEventSchema,
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = eventSchema.parse(body);

    // Get IP address from headers
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() ||
                      request.headers.get("x-real-ip") ||
                      "unknown";

    switch (event.event) {
      case "session_start":
        return handleSessionStart(event, ipAddress);
      case "page_view":
        return handlePageView(event);
      case "page_exit":
        return handlePageExit(event);
      case "heartbeat":
        return handleHeartbeat(event);
      case "earl_chat":
        return handleEarlChat(event);
      case "form_submit":
        return handleFormSubmit(event);
      case "custom_event":
        return handleCustomEvent(event);
      default:
        return NextResponse.json({ error: "Unknown event type" }, { status: 400 });
    }
  } catch (error) {
    console.error("Tracking error:", error instanceof Error ? error.message : error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid tracking data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Tracking failed" }, { status: 500 });
  }
}

async function handleSessionStart(
  event: z.infer<typeof sessionStartSchema>,
  ipAddress: string
) {
  const { visitorId, sessionId, data } = event;

  // Check if session already exists (client may resend session_start on page refresh)
  const existingSession = await db.visitorSession.findUnique({
    where: { sessionId },
    include: { visitor: true },
  });

  if (existingSession) {
    // Session already exists, just update activity and return
    await db.visitorSession.update({
      where: { id: existingSession.id },
      data: { lastActivityAt: new Date() },
    });
    return NextResponse.json({
      success: true,
      visitorDbId: existingSession.visitor.id,
      sessionDbId: existingSession.id,
      isReturning: existingSession.visitor.totalSessions > 1,
    });
  }

  // Find or create visitor
  let visitor = await db.visitor.findUnique({
    where: { visitorId },
  });

  if (visitor) {
    // Update returning visitor
    visitor = await db.visitor.update({
      where: { visitorId },
      data: {
        lastSeenAt: new Date(),
        totalSessions: { increment: 1 },
      },
    });
  } else {
    // Create new visitor
    visitor = await db.visitor.create({
      data: {
        visitorId,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        totalSessions: 1,
        totalPageViews: 0,
        totalTimeOnSite: 0,
      },
    });
  }

  // Create new session
  const session = await db.visitorSession.create({
    data: {
      visitorId: visitor.id,
      sessionId,
      // UTM
      utmSource: data.utmSource || null,
      utmMedium: data.utmMedium || null,
      utmCampaign: data.utmCampaign || null,
      utmTerm: data.utmTerm || null,
      utmContent: data.utmContent || null,
      // Traffic
      referrer: data.referrer || null,
      referrerDomain: data.referrerDomain || null,
      landingPage: data.landingPage,
      // Device
      deviceType: data.deviceType || null,
      browser: data.browser || null,
      browserVersion: data.browserVersion || null,
      os: data.os || null,
      osVersion: data.osVersion || null,
      screenWidth: data.screenWidth || null,
      screenHeight: data.screenHeight || null,
      language: data.language || null,
      timezone: data.timezone || null,
      // Location
      ipAddress,
      // Metrics
      startedAt: new Date(),
      lastActivityAt: new Date(),
      pageViewCount: 0,
      totalDuration: 0,
    },
  });

  // Look up geo location from IP (async, don't block response)
  lookupIpLocation(ipAddress).then(async (geo) => {
    if (geo) {
      await db.visitorSession.update({
        where: { id: session.id },
        data: {
          country: geo.country,
          region: geo.region,
          city: geo.city,
        },
      }).catch((err) => console.debug("Failed to update geo:", err));
    }
  }).catch(() => {}); // Silently fail - geo is nice to have

  return NextResponse.json({
    success: true,
    visitorDbId: visitor.id,
    sessionDbId: session.id,
    isReturning: visitor.totalSessions > 1,
  });
}

async function handlePageView(event: z.infer<typeof pageViewSchema>) {
  const { sessionId, data } = event;

  // Find session
  const session = await db.visitorSession.findUnique({
    where: { sessionId },
    include: { visitor: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Create page view
  await db.pageView.create({
    data: {
      sessionId: session.id,
      pagePath: data.pagePath,
      pageTitle: data.pageTitle || null,
      pageType: data.pageType || null,
      previousPage: data.previousPage || null,
      enteredAt: new Date(),
    },
  });

  // Update session
  await db.visitorSession.update({
    where: { id: session.id },
    data: {
      lastActivityAt: new Date(),
      pageViewCount: { increment: 1 },
    },
  });

  // Update visitor total page views
  await db.visitor.update({
    where: { id: session.visitorId },
    data: {
      lastSeenAt: new Date(),
      totalPageViews: { increment: 1 },
    },
  });

  return NextResponse.json({ success: true });
}

async function handlePageExit(event: z.infer<typeof pageExitSchema>) {
  const { sessionId, data } = event;

  // Find session
  const session = await db.visitorSession.findUnique({
    where: { sessionId },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Find the most recent page view for this path
  const pageView = await db.pageView.findFirst({
    where: {
      sessionId: session.id,
      pagePath: data.pagePath,
      exitedAt: null,
    },
    orderBy: { enteredAt: "desc" },
  });

  if (pageView) {
    await db.pageView.update({
      where: { id: pageView.id },
      data: {
        exitedAt: new Date(),
        duration: data.duration,
        scrollDepth: data.scrollDepth || null,
      },
    });
  }

  return NextResponse.json({ success: true });
}

async function handleHeartbeat(event: z.infer<typeof heartbeatSchema>) {
  const { sessionId, data } = event;

  // Find session
  const session = await db.visitorSession.findUnique({
    where: { sessionId },
    include: { visitor: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Calculate time delta since last heartbeat
  const timeDelta = data.sessionDuration - session.totalDuration;

  // Update session
  await db.visitorSession.update({
    where: { id: session.id },
    data: {
      lastActivityAt: new Date(),
      totalDuration: data.sessionDuration,
    },
  });

  // Update visitor total time
  if (timeDelta > 0) {
    await db.visitor.update({
      where: { id: session.visitorId },
      data: {
        lastSeenAt: new Date(),
        totalTimeOnSite: { increment: timeDelta },
      },
    });
  }

  // Check for hot prospect alerts every 2 minutes (4 heartbeats at 30s interval)
  // Only check if session duration is a multiple of 120 seconds
  if (data.sessionDuration > 0 && data.sessionDuration % 120 < 30) {
    checkAndSendHotProspectAlert(session.visitor.visitorId, sessionId).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

async function handleEarlChat(event: z.infer<typeof earlChatSchema>) {
  const { sessionId, visitorId } = event;

  // Update session to mark Earl chat occurred
  await db.visitorSession.updateMany({
    where: { sessionId },
    data: {
      hadEarlChat: true,
      lastActivityAt: new Date(),
    },
  });

  // Check for hot prospect alert (Earl chat is a high engagement signal)
  checkAndSendHotProspectAlert(visitorId, sessionId).catch(() => {});

  return NextResponse.json({ success: true });
}

async function handleFormSubmit(event: z.infer<typeof formSubmitSchema>) {
  const { sessionId } = event;

  // Update session to mark form submitted
  await db.visitorSession.updateMany({
    where: { sessionId },
    data: {
      submittedForm: true,
      formSubmittedAt: new Date(),
      lastActivityAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}

async function handleCustomEvent(event: z.infer<typeof customEventSchema>) {
  const { visitorId, sessionId, data } = event;

  // Create custom event record
  await db.customEvent.create({
    data: {
      sessionId,
      visitorId,
      eventType: data.eventType as any, // Will match the EventType enum
      eventName: data.eventName,
      eventCategory: data.eventCategory || null,
      pagePath: data.pagePath,
      elementId: data.elementId || null,
      elementText: data.elementText || null,
      metadata: (data.metadata as any) || undefined,  // JSON field
      scrollDepth: data.scrollDepth || null,
      mediaUrl: data.mediaUrl || null,
      mediaDuration: data.mediaDuration || null,
      mediaPosition: data.mediaPosition || null,
      fileName: data.fileName || null,
      fileType: data.fileType || null,
      timestamp: new Date(),
    },
  });

  // Update session last activity
  await db.visitorSession.updateMany({
    where: { sessionId },
    data: {
      lastActivityAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}

// GET endpoint to retrieve visitor data (for admin use)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const visitorId = searchParams.get("visitorId");
  const sessionId = searchParams.get("sessionId");

  if (visitorId) {
    const visitor = await db.visitor.findUnique({
      where: { visitorId },
      include: {
        sessions: {
          orderBy: { startedAt: "desc" },
          take: 10,
          include: {
            pageViews: {
              orderBy: { enteredAt: "asc" },
            },
          },
        },
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

    return NextResponse.json({ visitor });
  }

  if (sessionId) {
    const session = await db.visitorSession.findUnique({
      where: { sessionId },
      include: {
        visitor: true,
        pageViews: {
          orderBy: { enteredAt: "asc" },
        },
      },
    });

    return NextResponse.json({ session });
  }

  return NextResponse.json({ error: "visitorId or sessionId required" }, { status: 400 });
}
