import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Get single phase
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

    const phase = await db.academyPhase.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { sequence: "asc" },
        },
      },
    });

    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    return NextResponse.json({ phase });
  } catch (error) {
    console.error("Phase get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch phase" },
      { status: 500 }
    );
  }
}

// PUT - Update phase
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
    const { title, description, duration, imageUrl, order, dayStart, dayEnd, programId } = body;

    const existing = await db.academyPhase.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    // If title changed, update slug
    let slug = existing.slug;
    if (title && title !== existing.title) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check for slug collision
      const slugExists = await db.academyPhase.findFirst({
        where: { slug, id: { not: id } },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "A phase with this title already exists" },
          { status: 400 }
        );
      }
    }

    const phase = await db.academyPhase.update({
      where: { id },
      data: {
        slug,
        title: title ?? existing.title,
        description: description !== undefined ? description : existing.description,
        duration: duration ?? existing.duration,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
        order: order ?? existing.order,
        dayStart: dayStart !== undefined ? dayStart : existing.dayStart,
        dayEnd: dayEnd !== undefined ? dayEnd : existing.dayEnd,
        programId: programId !== undefined ? programId : existing.programId,
      },
    });

    return NextResponse.json({ phase });
  } catch (error) {
    console.error("Phase update error:", error);
    return NextResponse.json(
      { error: "Failed to update phase" },
      { status: 500 }
    );
  }
}

// DELETE - Delete phase
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

    const existing = await db.academyPhase.findUnique({
      where: { id },
      include: { modules: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    if (existing.modules.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete phase with existing modules. Delete modules first." },
        { status: 400 }
      );
    }

    await db.academyPhase.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Phase delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete phase" },
      { status: 500 }
    );
  }
}
