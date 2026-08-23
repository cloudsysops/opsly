import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { MeetingType, MeetingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const createMeetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  meetingType: z.nativeEnum(MeetingType),
  location: z.string().optional(),
  scheduledFor: z.string().datetime(),
  duration: z.number().int().positive(),
  attendees: z.array(z.string()).optional(),
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
    const data = createMeetingSchema.parse(body);

    // Verify prospect exists
    const prospect = await db.prospect.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Create meeting
    const meeting = await db.crmMeeting.create({
      data: {
        prospectId: id,
        title: data.title,
        description: data.description,
        meetingType: data.meetingType,
        location: data.location,
        scheduledFor: new Date(data.scheduledFor),
        duration: data.duration,
        attendees: data.attendees || [prospect.email],
        createdBy: session.user.email || "unknown",
      },
    });

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: id,
        activityType: "CALL_LOGGED", // Using CALL_LOGGED for meetings too
        description: `Scheduled ${data.meetingType.toLowerCase().replace("_", " ")}: ${data.title}`,
        performedBy: session.user.email || undefined,
        metadata: {
          meetingId: meeting.id,
          meetingType: data.meetingType,
          scheduledFor: data.scheduledFor,
        },
      },
    });

    return NextResponse.json({ success: true, meeting });
  } catch (error) {
    console.error("Error creating meeting:", error);

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

    const meetings = await db.crmMeeting.findMany({
      where: { prospectId: id },
      orderBy: { scheduledFor: "desc" },
    });

    return NextResponse.json(meetings);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
