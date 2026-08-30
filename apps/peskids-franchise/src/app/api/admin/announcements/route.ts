import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List all announcements with read counts
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [announcements, totalFranchisees] = await Promise.all([
      db.announcement.findMany({
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: {
          _count: {
            select: { reads: true },
          },
        },
      }),
      db.prospect.count({
        where: { pipelineStage: "SELECTED" },
      }),
    ]);

    return NextResponse.json({ announcements, totalFranchisees });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// POST - Create new announcement
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, category, priority, isPinned, expiresAt } = body;

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: "Title, content, and category are required" },
        { status: 400 }
      );
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        category,
        priority: priority || "NORMAL",
        status: "DRAFT",
        isPinned: isPinned || false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: session.user.email,
      },
      include: {
        _count: {
          select: { reads: true },
        },
      },
    });

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
