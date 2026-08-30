import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/admin/prework/[id]/history - Get version history
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const history = await db.preWorkSchemaVersion.findMany({
      where: { moduleId: id },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        publishedAt: true,
        publishedBy: true,
        changeNotes: true,
        formSchema: true,
      },
    });

    // Get current live version info
    const module = await db.preWorkModule.findUnique({
      where: { id },
      select: {
        formSchemaVersion: true,
        formSchema: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      currentVersion: module?.formSchemaVersion || 1,
      currentSchema: module?.formSchema,
      history,
    });
  } catch (error) {
    console.error("Error fetching schema history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}

// POST /api/admin/prework/[id]/history - Restore a previous version
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { version } = body as { version: number };

    if (typeof version !== "number") {
      return NextResponse.json(
        { error: "Version number required" },
        { status: 400 }
      );
    }

    // Get the historical version
    const historicalVersion = await db.preWorkSchemaVersion.findUnique({
      where: {
        moduleId_version: { moduleId: id, version },
      },
    });

    if (!historicalVersion) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    // Set as draft for review before publishing
    await db.preWorkModule.update({
      where: { id },
      data: {
        draftFormSchema: historicalVersion.formSchema as unknown as Prisma.InputJsonValue,
        draftUpdatedAt: new Date(),
        draftUpdatedBy: session.user.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Version ${version} restored as draft. Review and publish when ready.`,
    });
  } catch (error) {
    console.error("Error restoring version:", error);
    return NextResponse.json(
      { error: "Failed to restore version" },
      { status: 500 }
    );
  }
}
