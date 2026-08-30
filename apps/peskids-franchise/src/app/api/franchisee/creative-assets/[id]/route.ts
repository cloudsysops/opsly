import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH /api/franchisee/creative-assets/[id] - Update own asset only
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: { franchiseeAccount: true },
    });

    if (!prospect || prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Find the asset and verify ownership
    const asset = await db.creativeAsset.findUnique({
      where: { id },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    if (asset.uploadedById !== prospect.id) {
      return NextResponse.json(
        { error: "You can only edit your own assets" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, category, isPublic, externalUrl, thumbnailUrl } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (externalUrl !== undefined) updateData.externalUrl = externalUrl;
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;

    const updated = await db.creativeAsset.update({
      where: { id },
      data: updateData,
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({ asset: updated });
  } catch (error) {
    console.error("Error updating creative asset:", error);
    return NextResponse.json(
      { error: "Failed to update creative asset" },
      { status: 500 }
    );
  }
}

// DELETE /api/franchisee/creative-assets/[id] - Delete own asset only
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: { franchiseeAccount: true },
    });

    if (!prospect || prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Find the asset and verify ownership
    const asset = await db.creativeAsset.findUnique({
      where: { id },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    if (asset.uploadedById !== prospect.id) {
      return NextResponse.json(
        { error: "You can only delete your own assets" },
        { status: 403 }
      );
    }

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
