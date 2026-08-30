import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createNoteSchema = z.object({
  content: z.string().min(1, "Note content is required"),
  isPinned: z.boolean().optional(),
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
    const data = createNoteSchema.parse(body);

    // Verify prospect exists
    const prospect = await db.prospect.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Create note
    const note = await db.prospectNote.create({
      data: {
        prospectId: id,
        content: data.content,
        authorEmail: session.user.email || "unknown",
        isPinned: data.isPinned || false,
      },
    });

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: id,
        activityType: "NOTE_ADDED",
        description: "Added a note",
        performedBy: session.user.email || undefined,
        metadata: {
          noteId: note.id,
          preview: data.content.slice(0, 100),
        },
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error("Error creating note:", error);

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

    const notes = await db.prospectNote.findMany({
      where: { prospectId: id },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
