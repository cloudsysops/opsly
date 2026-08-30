import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ContentBlockType } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST - Create a new content block
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { moduleId, type, ...blockData } = body;

    if (!moduleId || !type) {
      return NextResponse.json(
        { error: "moduleId and type are required" },
        { status: 400 }
      );
    }

    // Validate block type
    if (!Object.values(ContentBlockType).includes(type)) {
      return NextResponse.json(
        { error: "Invalid block type" },
        { status: 400 }
      );
    }

    // Verify module exists
    const module = await db.academyModule.findUnique({ where: { id: moduleId } });
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Get next order number
    const lastBlock = await db.contentBlock.findFirst({
      where: { moduleId },
      orderBy: { order: "desc" },
    });
    const nextOrder = (lastBlock?.order ?? -1) + 1;

    const block = await db.contentBlock.create({
      data: {
        moduleId,
        type: type as ContentBlockType,
        order: nextOrder,
        // Spread type-specific fields
        content: blockData.content,
        videoUrl: blockData.videoUrl,
        videoProvider: blockData.videoProvider,
        imageUrl: blockData.imageUrl,
        imageAlt: blockData.imageAlt,
        imageCaption: blockData.imageCaption,
        fileUrl: blockData.fileUrl,
        fileTitle: blockData.fileTitle,
        fileDescription: blockData.fileDescription,
        calloutType: blockData.calloutType,
        calloutTitle: blockData.calloutTitle,
        calloutContent: blockData.calloutContent,
        checkpointText: blockData.checkpointText,
        quizQuestion: blockData.quizQuestion,
        quizOptions: blockData.quizOptions,
        correctAnswer: blockData.correctAnswer,
        quizExplanation: blockData.quizExplanation,
        checklistTitle: blockData.checklistTitle,
        checklistItems: blockData.checklistItems,
      },
    });

    return NextResponse.json({ block }, { status: 201 });
  } catch (error) {
    console.error("Block create error:", error);
    return NextResponse.json(
      { error: "Failed to create block" },
      { status: 500 }
    );
  }
}
