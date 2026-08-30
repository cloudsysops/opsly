import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { MeetingType, MeetingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateMeetingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  meetingType: z.nativeEnum(MeetingType).optional(),
  location: z.string().nullable().optional(),
  scheduledFor: z.string().datetime().optional(),
  duration: z.number().int().positive().optional(),
  status: z.nativeEnum(MeetingStatus).optional(),
  outcome: z.string().nullable().optional(),
  attendees: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "REVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, meetingId } = await params;
    const body = await request.json();
    const data = updateMeetingSchema.parse(body);

    // Verify meeting exists and belongs to this prospect
    const existingMeeting = await db.crmMeeting.findFirst({
      where: { id: meetingId, prospectId: id },
    });

    if (!existingMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const meeting = await db.crmMeeting.update({
      where: { id: meetingId },
      data: {
        ...data,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
      },
    });

    // If meeting was marked as completed, update last contact
    if (data.status === "COMPLETED" && existingMeeting.status !== "COMPLETED") {
      await db.prospect.update({
        where: { id },
        data: { lastContactAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, meeting });
  } catch (error) {
    console.error("Error updating meeting:", error);

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, meetingId } = await params;

    // Verify meeting exists and belongs to this prospect
    const existingMeeting = await db.crmMeeting.findFirst({
      where: { id: meetingId, prospectId: id },
    });

    if (!existingMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    await db.crmMeeting.delete({
      where: { id: meetingId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meeting:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
