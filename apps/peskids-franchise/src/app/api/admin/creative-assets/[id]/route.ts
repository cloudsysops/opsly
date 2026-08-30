import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH - Update a creative asset
export async function PATCH(
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

    // Build update data from provided fields only
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      "title",
      "description",
      "category",
      "sourceType",
      "canvaDesignId",
      "canvaEmbedUrl",
      "canvaThumbnailUrl",
      "fileUrl",
      "fileName",
      "fileSizeBytes",
      "mimeType",
      "externalUrl",
      "thumbnailUrl",
      "isOfficial",
      "isPublic",
      "sortOrder",
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const asset = await db.creativeAsset.update({
      where: { id },
      data: updateData,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Error updating creative asset:", error);
    return NextResponse.json(
      { error: "Failed to update creative asset" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a creative asset
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

    await db.creativeAsset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting creative asset:", error);
    return NextResponse.json(
      { error: "Failed to delete creative asset" },
      { status: 500 }
    );
  }
}
