import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ResourceCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET - Get single resource
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

    const resource = await db.academyResource.findUnique({
      where: { id },
    });

    if (!resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    return NextResponse.json({ resource });
  } catch (error) {
    console.error("Resource get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch resource" },
      { status: 500 }
    );
  }
}

// PUT - Update resource
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
      title,
      description,
      category,
      fileUrl,
      externalUrl,
      content,
      isPublic,
    } = body;

    const existing = await db.academyResource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    // Validate category if provided
    if (category && !Object.values(ResourceCategory).includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
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

      slug = baseSlug;
      let counter = 1;
      while (
        await db.academyResource.findFirst({
          where: { slug, id: { not: id } },
        })
      ) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const resource = await db.academyResource.update({
      where: { id },
      data: {
        slug,
        title: title ?? existing.title,
        description: description ?? existing.description,
        category: (category as ResourceCategory) ?? existing.category,
        fileUrl: fileUrl !== undefined ? fileUrl : existing.fileUrl,
        externalUrl: externalUrl !== undefined ? externalUrl : existing.externalUrl,
        content: content !== undefined ? content : existing.content,
        isPublic: isPublic !== undefined ? isPublic : existing.isPublic,
      },
    });

    return NextResponse.json({ resource });
  } catch (error) {
    console.error("Resource update error:", error);
    return NextResponse.json(
      { error: "Failed to update resource" },
      { status: 500 }
    );
  }
}

// DELETE - Delete resource
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

    const existing = await db.academyResource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    await db.academyResource.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resource delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete resource" },
      { status: 500 }
    );
  }
}
