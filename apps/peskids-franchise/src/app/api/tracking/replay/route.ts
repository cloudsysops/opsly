import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Schema for init action
const initSchema = z.object({
  action: z.literal("init"),
  sessionId: z.string(),
  visitorId: z.string(),
  pagePath: z.string(),
  viewportWidth: z.number().optional(),
  viewportHeight: z.number().optional(),
  pageWidth: z.number().optional(),
  pageHeight: z.number().optional(),
  userAgent: z.string().optional(),
});

// Schema for batch action - accepts any array of events (rrweb format)
const batchSchema = z.object({
  action: z.literal("batch"),
  sessionId: z.string(),
  visitorId: z.string(),
  events: z.array(z.any()), // rrweb events have complex structure
  isComplete: z.boolean().optional(),
  duration: z.number().optional(),
});

const requestSchema = z.discriminatedUnion("action", [initSchema, batchSchema]);

export async function POST(request: NextRequest) {
  try {
    let body;
    const contentType = request.headers.get("content-type") || "";

    // Handle both JSON and sendBeacon (which may not have correct content-type)
    if (contentType.includes("text/plain") || contentType.includes("application/json")) {
      const text = await request.text();
      body = JSON.parse(text);
    } else {
      body = await request.json();
    }

    const data = requestSchema.parse(body);

    if (data.action === "init") {
      return handleInit(data);
    } else if (data.action === "batch") {
      return handleBatch(data);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Session replay error:", error instanceof Error ? error.message : error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid replay data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Replay tracking failed" }, { status: 500 });
  }
}

async function handleInit(data: z.infer<typeof initSchema>) {
  const { sessionId, visitorId, pagePath, viewportWidth, viewportHeight, pageWidth, pageHeight, userAgent } = data;

  // Check if replay already exists for this session
  const existing = await db.sessionReplay.findUnique({
    where: { sessionId },
  });

  if (existing) {
    return NextResponse.json({ success: true, id: existing.id, status: "existing" });
  }

  // Create new session replay record
  const replay = await db.sessionReplay.create({
    data: {
      sessionId,
      visitorId,
      pagePath,
      viewportWidth,
      viewportHeight,
      pageWidth,
      pageHeight,
      userAgent,
      startedAt: new Date(),
      events: [],
      eventCount: 0,
    },
  });

  return NextResponse.json({ success: true, id: replay.id, status: "created" });
}

async function handleBatch(data: z.infer<typeof batchSchema>) {
  const { sessionId, visitorId, events, isComplete } = data;

  // Find existing replay
  const replay = await db.sessionReplay.findUnique({
    where: { sessionId },
  });

  // Calculate duration from rrweb events (they have timestamp field)
  let duration = 0;
  if (events.length > 0) {
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    if (firstEvent?.timestamp && lastEvent?.timestamp) {
      duration = Math.round((lastEvent.timestamp - firstEvent.timestamp) / 1000);
    }
  }

  if (!replay) {
    // Create replay if it doesn't exist (can happen if init failed)
    await db.sessionReplay.create({
      data: {
        sessionId,
        visitorId,
        pagePath: "/unknown",
        events: events as any, // JSON field
        eventCount: events.length,
        isComplete: isComplete || false,
        duration: duration,
        endedAt: isComplete ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, status: "created_with_batch" });
  }

  // Append events to existing replay
  const existingEvents = (replay.events as unknown[]) || [];
  const newEvents = [...existingEvents, ...events];

  // Limit total events to prevent massive records (rrweb can generate many events)
  const limitedEvents = newEvents.slice(-50000);

  // Calculate total duration from all events
  let totalDuration = replay.duration || 0;
  if (limitedEvents.length > 0) {
    const firstEvent = limitedEvents[0] as any;
    const lastEvent = limitedEvents[limitedEvents.length - 1] as any;
    if (firstEvent?.timestamp && lastEvent?.timestamp) {
      totalDuration = Math.round((lastEvent.timestamp - firstEvent.timestamp) / 1000);
    }
  }

  await db.sessionReplay.update({
    where: { id: replay.id },
    data: {
      events: limitedEvents as any, // JSON field
      eventCount: limitedEvents.length,
      duration: totalDuration,
      isComplete: isComplete || replay.isComplete,
      endedAt: isComplete ? new Date() : replay.endedAt,
    },
  });

  return NextResponse.json({
    success: true,
    eventCount: limitedEvents.length,
    status: isComplete ? "completed" : "updated",
  });
}

// GET endpoint to retrieve replay data for playback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const id = searchParams.get("id");

  if (id) {
    const replay = await db.sessionReplay.findUnique({
      where: { id },
    });

    if (!replay) {
      return NextResponse.json({ error: "Replay not found" }, { status: 404 });
    }

    return NextResponse.json({ replay });
  }

  if (sessionId) {
    const replay = await db.sessionReplay.findUnique({
      where: { sessionId },
    });

    if (!replay) {
      return NextResponse.json({ error: "Replay not found" }, { status: 404 });
    }

    return NextResponse.json({ replay });
  }

  // List recent replays for admin
  const replays = await db.sessionReplay.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
    select: {
      id: true,
      sessionId: true,
      visitorId: true,
      pagePath: true,
      startedAt: true,
      duration: true,
      eventCount: true,
      isComplete: true,
      viewportWidth: true,
      viewportHeight: true,
    },
  });

  return NextResponse.json({ replays });
}
