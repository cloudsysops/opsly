import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AcademyModuleType } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET - List all modules (optionally filtered by phase)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const phaseId = searchParams.get("phaseId");

    const modules = await db.academyModule.findMany({
      where: phaseId ? { phaseId } : undefined,
      include: {
        phase: {
          select: { id: true, title: true },
        },
      },
      orderBy: [{ phase: { order: "asc" } }, { order: "asc" }],
    });

    return NextResponse.json({ modules });
  } catch (error) {
    console.error("Modules list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch modules" },
      { status: 500 }
    );
  }
}

// POST - Create a new module
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      phaseId,
      title,
      description,
      content,
      moduleType,
      duration,
      points,
      resourceUrl,
      quizData,
      owner,
      verificationType,
      targetDay,
      isMilestone,
      notifyFranchisor,
      franchisorActionText,
      stepWhat,
      stepHow,
      stepWhy,
      dataFields,
      resourcePageId,
      sectionOrder,
    } = body;

    if (!phaseId || !title || !moduleType) {
      return NextResponse.json(
        { error: "phaseId, title, and moduleType are required" },
        { status: 400 }
      );
    }

    // Validate module type
    if (!Object.values(AcademyModuleType).includes(moduleType)) {
      return NextResponse.json(
        { error: "Invalid module type" },
        { status: 400 }
      );
    }

    // Check phase exists
    const phase = await db.academyPhase.findUnique({ where: { id: phaseId } });
    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    // Generate slug from title
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check for existing slug and add suffix if needed
    let slug = baseSlug;
    let counter = 1;
    while (await db.academyModule.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Get next sequence number for this phase
    const lastModule = await db.academyModule.findFirst({
      where: { phaseId },
      orderBy: { order: "desc" },
    });
    const nextSequence = (lastModule?.order || 0) + 1;

    const module = await db.academyModule.create({
      data: {
        phaseId,
        slug,
        title,
        description: description || undefined,
        content: content || undefined,
        moduleType: moduleType as AcademyModuleType,
        duration: duration || 15,
        points: points || 10,
        resourceUrl,
        quizData,
        order: nextSequence,
        owner: owner || undefined,
        verificationType: verificationType || undefined,
        targetDay: targetDay || undefined,
        isMilestone: isMilestone ?? false,
        notifyFranchisor: notifyFranchisor ?? false,
        franchisorActionText: franchisorActionText || undefined,
        stepWhat: stepWhat || undefined,
        stepHow: stepHow || undefined,
        stepWhy: stepWhy || undefined,
        dataFields: dataFields || undefined,
        resourcePageId: resourcePageId || undefined,
        sectionOrder: sectionOrder || undefined,
      },
    });

    return NextResponse.json({ module }, { status: 201 });
  } catch (error) {
    console.error("Module create error:", error);
    return NextResponse.json(
      { error: "Failed to create module" },
      { status: 500 }
    );
  }
}
