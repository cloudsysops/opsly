import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "PROSPECT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify prospect is SELECTED
    const prospect = await db.prospect.findUnique({
      where: { id: session.user.id },
      select: { pipelineStage: true },
    });

    if (!prospect || prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json(
        { error: "Academy access requires SELECTED status" },
        { status: 403 }
      );
    }

    // Get conversation with messages
    const conversation = await db.chatConversation.findFirst({
      where: {
        id,
        prospectId: session.user.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        metadata: m.metadata,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
