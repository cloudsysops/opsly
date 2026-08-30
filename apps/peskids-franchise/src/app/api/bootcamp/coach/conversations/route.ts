import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "PROSPECT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Get conversations with message count
    const conversations = await db.chatConversation.findMany({
      where: {
        prospectId: session.user.id,
        sessionId: {
          startsWith: "academy-",
        },
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c._count.messages,
      })),
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
