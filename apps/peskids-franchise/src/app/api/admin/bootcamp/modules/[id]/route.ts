import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AcademyModuleType } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET - Get single module
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const module = await db.academyModule.findUnique({
      where: { id },
      include: {
        phase: {
          select: { id: true, title: true },
        },
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    return NextResponse.json({ module });
  } catch (error) {
    console.error("Module get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch module" },
      { status: 500 }
    );
  }
}

// PUT - Update module
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
      order,
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
      completionEmailTemplateId,
    } = body;

    const existing = await db.academyModule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // If phaseId changed, verify new phase exists
    if (phaseId && phaseId !== existing.phaseId) {
      const phase = await db.academyPhase.findUnique({ where: { id: phaseId } });
      if (!phase) {
        return NextResponse.json({ error: "Phase not found" }, { status: 404 });
      }
    }

    // Validate module type if provided
    if (moduleType && !Object.values(AcademyModuleType).includes(moduleType)) {
      return NextResponse.json(
        { error: "Invalid module type" },
        { status: 400 }
      );
    }

    // If title changed, update slug
    let slug = existing.slug;
    if (title && title !== existing.title) {
      const baseSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check for slug collision
      slug = baseSlug;
      let counter = 1;
      while (
        await db.academyModule.findFirst({
          where: { slug, id: { not: id } },
        })
      ) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const module = await db.academyModule.update({
      where: { id },
      data: {
        phaseId: phaseId ?? existing.phaseId,
        slug,
        title: title ?? existing.title,
        description: description ?? existing.description,
        content: content ?? existing.content,
        moduleType: (moduleType as AcademyModuleType) ?? existing.moduleType,
        duration: duration ?? existing.duration,
        points: points ?? existing.points,
        resourceUrl: resourceUrl !== undefined ? resourceUrl : existing.resourceUrl,
        quizData: quizData !== undefined ? quizData : existing.quizData,
        order: order ?? existing.order,
        owner: owner !== undefined ? (owner || null) : existing.owner,
        verificationType: verificationType !== undefined ? (verificationType || null) : existing.verificationType,
        targetDay: targetDay !== undefined ? targetDay : existing.targetDay,
        isMilestone: isMilestone !== undefined ? isMilestone : existing.isMilestone,
        notifyFranchisor: notifyFranchisor !== undefined ? notifyFranchisor : existing.notifyFranchisor,
        franchisorActionText: franchisorActionText !== undefined ? franchisorActionText : existing.franchisorActionText,
        stepWhat: stepWhat !== undefined ? (stepWhat || null) : existing.stepWhat,
        stepHow: stepHow !== undefined ? (stepHow || null) : existing.stepHow,
        stepWhy: stepWhy !== undefined ? (stepWhy || null) : existing.stepWhy,
        dataFields: dataFields !== undefined ? dataFields : existing.dataFields,
        resourcePageId: resourcePageId !== undefined ? (resourcePageId || null) : existing.resourcePageId,
        sectionOrder: sectionOrder !== undefined ? sectionOrder : existing.sectionOrder,
        completionEmailTemplateId: completionEmailTemplateId !== undefined ? (completionEmailTemplateId || null) : existing.completionEmailTemplateId,
      },
    });

    return NextResponse.json({ module });
  } catch (error) {
    console.error("Module update error:", error);
    return NextResponse.json(
      { error: "Failed to update module" },
      { status: 500 }
    );
  }
}

// DELETE - Delete module
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

    const existing = await db.academyModule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Check for existing progress - warn but allow deletion (cascade will handle it)
    const progressCount = await db.academyProgress.count({
      where: { moduleId: id },
    });

    if (progressCount > 0) {
      // Still delete, but note it will cascade delete progress records
      console.log(
        `Deleting module ${id} with ${progressCount} progress records`
      );
    }

    await db.academyModule.delete({ where: { id } });

    return NextResponse.json({ success: true, progressDeleted: progressCount });
  } catch (error) {
    console.error("Module delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete module" },
      { status: 500 }
    );
  }
}
