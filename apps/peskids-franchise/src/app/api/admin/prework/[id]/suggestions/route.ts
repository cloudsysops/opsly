import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePreWorkSuggestions } from "@/lib/ai/prework-suggestions";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/admin/prework/[id]/suggestions - Generate AI suggestions
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Get module with submissions for analysis
    const module = await db.preWorkModule.findUnique({
      where: { id },
      include: {
        submissions: {
          where: { status: "SUBMITTED" },
          include: {
            prospect: {
              include: {
                preWorkEvaluation: true,
              },
            },
          },
          orderBy: { submittedAt: "desc" },
          take: 50, // Analyze last 50 submissions
        },
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Generate suggestions using AI
    const suggestionSet = await generatePreWorkSuggestions(module);

    // Store the suggestion
    const suggestion = await db.preWorkAISuggestion.create({
      data: {
        moduleId: id,
        suggestions: suggestionSet.suggestions as unknown as Prisma.InputJsonValue,
        analysisData: suggestionSet.analysisData as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      id: suggestion.id,
      ...suggestionSet,
      generatedAt: suggestion.generatedAt,
    });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/prework/[id]/suggestions - Apply or dismiss a suggestion
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { suggestionId, action } = body as {
      suggestionId: string;
      action: "apply" | "dismiss";
    };

    if (!suggestionId || !["apply", "dismiss"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    await db.preWorkAISuggestion.update({
      where: { id: suggestionId },
      data:
        action === "apply"
          ? { appliedAt: new Date() }
          : { dismissedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating suggestion:", error);
    return NextResponse.json(
      { error: "Failed to update suggestion" },
      { status: 500 }
    );
  }
}

// GET /api/admin/prework/[id]/suggestions - Get latest suggestion
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const suggestion = await db.preWorkAISuggestion.findFirst({
      where: {
        moduleId: id,
        dismissedAt: null,
        appliedAt: null,
      },
      orderBy: { generatedAt: "desc" },
    });

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("Error fetching suggestion:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestion" },
      { status: 500 }
    );
  }
}
