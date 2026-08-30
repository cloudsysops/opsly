import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { notifyHighScoreProspect } from "@/lib/email/notifications";

export const dynamic = "force-dynamic";

const updateProspectSchema = z.object({
  pipelineStage: z.enum([
    "NEW_INQUIRY",
    "INITIAL_CONTACT",
    "DISCOVERY_CALL",
    "PRE_WORK_IN_PROGRESS",
    "PRE_WORK_COMPLETE",
    "INTERVIEW",
    "SELECTION_REVIEW",
    "SELECTED",
    "REJECTED",
    "WITHDRAWN",
  ]).optional(),
  prospectScore: z.number().min(0).max(100).optional(),
  assignedTo: z.string().nullable().optional(),
  lastContactAt: z.string().datetime().optional(),
});

export async function PATCH(
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
    const data = updateProspectSchema.parse(body);

    // Get current prospect to log changes
    const currentProspect = await db.prospect.findUnique({
      where: { id },
      select: { pipelineStage: true, prospectScore: true, assignedTo: true },
    });

    if (!currentProspect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Update prospect
    const prospect = await db.prospect.update({
      where: { id },
      data: {
        ...data,
        lastContactAt: data.lastContactAt ? new Date(data.lastContactAt) : undefined,
      },
    });

    // Log stage change activity
    if (data.pipelineStage && data.pipelineStage !== currentProspect.pipelineStage) {
      await db.prospectActivity.create({
        data: {
          prospectId: id,
          activityType: "STAGE_CHANGED",
          description: `Stage changed from ${currentProspect.pipelineStage} to ${data.pipelineStage}`,
          performedBy: session.user.email || undefined,
          metadata: {
            previousStage: currentProspect.pipelineStage,
            newStage: data.pipelineStage,
          },
        },
      });
    }

    // Log score change activity and send high-score notification
    if (data.prospectScore !== undefined && data.prospectScore !== currentProspect.prospectScore) {
      await db.prospectActivity.create({
        data: {
          prospectId: id,
          activityType: "SCORE_UPDATED",
          description: `Score updated from ${currentProspect.prospectScore} to ${data.prospectScore}`,
          performedBy: session.user.email || undefined,
          metadata: {
            previousScore: currentProspect.prospectScore,
            newScore: data.prospectScore,
          },
        },
      });

      // Send high-score notification if crossing threshold (async, don't block response)
      notifyHighScoreProspect(
        {
          id: prospect.id,
          firstName: prospect.firstName,
          lastName: prospect.lastName,
          email: prospect.email,
          phone: prospect.phone,
          preferredTerritory: prospect.preferredTerritory,
          interestLevel: prospect.interestLevel,
          aboutYourself: prospect.aboutYourself,
          prospectScore: prospect.prospectScore,
        },
        currentProspect.prospectScore
      ).catch((err) => console.error("Error sending high-score notification:", err));
    }

    return NextResponse.json({ success: true, prospect });
  } catch (error) {
    console.error("Error updating prospect:", error);

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

    const prospect = await db.prospect.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        notes: {
          orderBy: { createdAt: "desc" },
        },
        preWorkSubmissions: {
          include: { module: true },
          orderBy: { createdAt: "desc" },
        },
        documents: true,
        conversations: {
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 5,
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    return NextResponse.json(prospect);
  } catch (error) {
    console.error("Error fetching prospect:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    // Only ADMIN can delete prospects (not REVIEWER)
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check prospect exists
    const prospect = await db.prospect.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Delete prospect (cascades to related records due to onDelete: Cascade in schema)
    await db.prospect.delete({
      where: { id },
    });

    console.log(
      `Prospect deleted by ${session.user.email}: ${prospect.firstName} ${prospect.lastName} (${prospect.email})`
    );

    return NextResponse.json({
      success: true,
      message: `Prospect ${prospect.firstName} ${prospect.lastName} has been permanently deleted.`
    });
  } catch (error) {
    console.error("Error deleting prospect:", error);
    return NextResponse.json(
      { error: "An error occurred while deleting the prospect" },
      { status: 500 }
    );
  }
}
