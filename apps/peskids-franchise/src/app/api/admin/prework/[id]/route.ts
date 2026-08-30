import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/admin/prework/[id] - Get single module with full details
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const module = await db.preWorkModule.findUnique({
      where: { id },
      include: {
        schemaHistory: {
          orderBy: { version: "desc" },
          take: 5,
        },
        aiSuggestions: {
          where: { dismissedAt: null, appliedAt: null },
          orderBy: { generatedAt: "desc" },
          take: 1,
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...module,
      submissionCount: module._count.submissions,
      hasDraft: module.draftFormSchema !== null,
      latestSuggestion: module.aiSuggestions[0] || null,
    });
  } catch (error) {
    console.error("Error fetching pre-work module:", error);
    return NextResponse.json(
      { error: "Failed to fetch module" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/prework/[id] - Update module metadata (not schema)
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();

    // Only allow updating metadata fields, not schema
    const { title, description, instructions, isRequired, sequence } = body;

    const module = await db.preWorkModule.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(instructions !== undefined && { instructions }),
        ...(isRequired !== undefined && { isRequired }),
        ...(sequence !== undefined && { sequence }),
      },
    });

    return NextResponse.json(module);
  } catch (error) {
    console.error("Error updating pre-work module:", error);
    return NextResponse.json(
      { error: "Failed to update module" },
      { status: 500 }
    );
  }
}
