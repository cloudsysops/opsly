import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// PUT - Update a content block
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.contentBlock.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    const block = await db.contentBlock.update({
      where: { id },
      data: {
        content: body.content !== undefined ? body.content : existing.content,
        videoUrl: body.videoUrl !== undefined ? body.videoUrl : existing.videoUrl,
        videoProvider: body.videoProvider !== undefined ? body.videoProvider : existing.videoProvider,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : existing.imageUrl,
        imageAlt: body.imageAlt !== undefined ? body.imageAlt : existing.imageAlt,
        imageCaption: body.imageCaption !== undefined ? body.imageCaption : existing.imageCaption,
        fileUrl: body.fileUrl !== undefined ? body.fileUrl : existing.fileUrl,
        fileTitle: body.fileTitle !== undefined ? body.fileTitle : existing.fileTitle,
        fileDescription: body.fileDescription !== undefined ? body.fileDescription : existing.fileDescription,
        calloutType: body.calloutType !== undefined ? body.calloutType : existing.calloutType,
        calloutTitle: body.calloutTitle !== undefined ? body.calloutTitle : existing.calloutTitle,
        calloutContent: body.calloutContent !== undefined ? body.calloutContent : existing.calloutContent,
        checkpointText: body.checkpointText !== undefined ? body.checkpointText : existing.checkpointText,
        quizQuestion: body.quizQuestion !== undefined ? body.quizQuestion : existing.quizQuestion,
        quizOptions: body.quizOptions !== undefined ? body.quizOptions : existing.quizOptions,
        correctAnswer: body.correctAnswer !== undefined ? body.correctAnswer : existing.correctAnswer,
        quizExplanation: body.quizExplanation !== undefined ? body.quizExplanation : existing.quizExplanation,
        checklistTitle: body.checklistTitle !== undefined ? body.checklistTitle : existing.checklistTitle,
        checklistItems: body.checklistItems !== undefined ? body.checklistItems : existing.checklistItems,
      },
    });

    return NextResponse.json({ block });
  } catch (error) {
    console.error("Block update error:", error);
    return NextResponse.json(
      { error: "Failed to update block" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a content block
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.contentBlock.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    await db.contentBlock.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Block delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete block" },
      { status: 500 }
    );
  }
}
