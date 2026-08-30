import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { CallType, CallDirection, CallOutcome } from "@prisma/client";

export const dynamic = "force-dynamic";

const createCallSchema = z.object({
  callType: z.nativeEnum(CallType),
  direction: z.nativeEnum(CallDirection),
  duration: z.number().int().positive().optional(),
  outcome: z.nativeEnum(CallOutcome).optional(),
  notes: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "REVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = createCallSchema.parse(body);

    // Verify prospect exists
    const prospect = await db.prospect.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Create call
    const call = await db.crmCall.create({
      data: {
        prospectId: id,
        callType: data.callType,
        direction: data.direction,
        duration: data.duration,
        outcome: data.outcome,
        notes: data.notes,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
        completedAt: data.completedAt ? new Date(data.completedAt) : new Date(),
        loggedBy: session.user.email || "unknown",
      },
    });

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: id,
        activityType: "CALL_LOGGED",
        description: `Logged ${data.direction.toLowerCase()} ${data.callType.toLowerCase()} call${data.outcome ? ` - ${data.outcome.toLowerCase().replace("_", " ")}` : ""}`,
        performedBy: session.user.email || undefined,
        metadata: {
          callId: call.id,
          callType: data.callType,
          direction: data.direction,
          outcome: data.outcome,
          duration: data.duration,
        },
      },
    });

    // Update last contact
    await db.prospect.update({
      where: { id },
      data: { lastContactAt: new Date() },
    });

    return NextResponse.json({ success: true, call });
  } catch (error) {
    console.error("Error creating call:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "REVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const calls = await db.crmCall.findMany({
      where: { prospectId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(calls);
  } catch (error) {
    console.error("Error fetching calls:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
