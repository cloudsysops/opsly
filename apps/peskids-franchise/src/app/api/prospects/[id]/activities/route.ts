import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type ActivityItem = {
  id: string;
  type: "note" | "email" | "sent-email" | "call" | "meeting" | "task" | "activity";
  timestamp: Date;
  data: unknown;
};

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
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Verify prospect exists
    const prospect = await db.prospect.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Fetch all activity types based on filter
    const activities: ActivityItem[] = [];

    if (filter === "all" || filter === "notes") {
      const notes = await db.prospectNote.findMany({
        where: { prospectId: id },
        orderBy: { createdAt: "desc" },
      });
      activities.push(
        ...notes.map((note) => ({
          id: note.id,
          type: "note" as const,
          timestamp: note.createdAt,
          data: note,
        }))
      );
    }

    if (filter === "all" || filter === "emails") {
      // Gmail synced emails
      const emails = await db.crmEmail.findMany({
        where: { prospectId: id },
        orderBy: { sentAt: "desc" },
      });
      activities.push(
        ...emails.map((email) => ({
          id: email.id,
          type: "email" as const,
          timestamp: email.sentAt,
          data: email,
        }))
      );

      // Sent emails from CMS/modal
      const sentEmails = await db.sentEmail.findMany({
        where: { prospectId: id },
        include: { template: { select: { name: true, slug: true } } },
        orderBy: { sentAt: "desc" },
      });
      activities.push(
        ...sentEmails.map((sentEmail) => ({
          id: sentEmail.id,
          type: "sent-email" as const,
          timestamp: sentEmail.sentAt,
          data: sentEmail,
        }))
      );
    }

    if (filter === "all" || filter === "calls") {
      const calls = await db.crmCall.findMany({
        where: { prospectId: id },
        orderBy: { createdAt: "desc" },
      });
      activities.push(
        ...calls.map((call) => ({
          id: call.id,
          type: "call" as const,
          timestamp: call.completedAt || call.createdAt,
          data: call,
        }))
      );
    }

    if (filter === "all" || filter === "meetings") {
      const meetings = await db.crmMeeting.findMany({
        where: { prospectId: id },
        orderBy: { scheduledFor: "desc" },
      });
      activities.push(
        ...meetings.map((meeting) => ({
          id: meeting.id,
          type: "meeting" as const,
          timestamp: meeting.scheduledFor,
          data: meeting,
        }))
      );
    }

    if (filter === "all" || filter === "tasks") {
      const tasks = await db.crmTask.findMany({
        where: { prospectId: id },
        orderBy: { createdAt: "desc" },
      });
      activities.push(
        ...tasks.map((task) => ({
          id: task.id,
          type: "task" as const,
          timestamp: task.createdAt,
          data: task,
        }))
      );
    }

    // Include system activities only when showing all
    if (filter === "all") {
      const systemActivities = await db.prospectActivity.findMany({
        where: {
          prospectId: id,
          // Exclude NOTE_ADDED since we're showing notes separately
          activityType: { notIn: ["NOTE_ADDED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      activities.push(
        ...systemActivities.map((activity) => ({
          id: activity.id,
          type: "activity" as const,
          timestamp: activity.createdAt,
          data: activity,
        }))
      );
    }

    // Sort by timestamp descending
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const paginated = activities.slice(offset, offset + limit);

    return NextResponse.json({
      activities: paginated,
      total: activities.length,
      hasMore: offset + limit < activities.length,
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
