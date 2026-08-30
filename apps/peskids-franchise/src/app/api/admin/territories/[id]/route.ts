import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/territories/[id] - Get single territory
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

    const territory = await db.market.findUnique({
      where: { id },
      include: {
        franchiseeAccount: {
          include: {
            prospect: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                preferredTerritory: true,
                selectedAt: true,
              },
            },
          },
        },
      },
    });

    if (!territory) {
      return NextResponse.json(
        { error: "Territory not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ territory });
  } catch (error) {
    console.error("Error fetching territory:", error);
    return NextResponse.json(
      { error: "Failed to fetch territory" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/territories/[id] - Update territory fields
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

    // Verify territory exists
    const existing = await db.market.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Territory not found" },
        { status: 404 }
      );
    }

    // Build update data from allowed fields
    const allowedFields = [
      "name",
      "state",
      "description",
      "status",
      "boundaryGeoJson",
      "centerLat",
      "centerLng",
      "radiusMiles",
      "population",
      "medianIncome",
      "householdsWithChildren",
      "totalHouseholds",
      "schoolCount",
      "demographicsUpdatedAt",
      "launchDate",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (
          ["centerLat", "centerLng", "radiusMiles"].includes(field) &&
          body[field] != null
        ) {
          updateData[field] = parseFloat(body[field]);
        } else if (
          [
            "population",
            "medianIncome",
            "householdsWithChildren",
            "totalHouseholds",
            "schoolCount",
          ].includes(field) &&
          body[field] != null
        ) {
          updateData[field] = parseInt(body[field], 10);
        } else if (
          ["demographicsUpdatedAt", "launchDate"].includes(field) &&
          body[field] != null
        ) {
          updateData[field] = new Date(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // If name or state is changing, check for duplicate
    if (updateData.name || updateData.state) {
      const checkName = (updateData.name as string) || existing.name;
      const checkState = (updateData.state as string) || existing.state;

      if (checkName !== existing.name || checkState !== existing.state) {
        const duplicate = await db.market.findUnique({
          where: { name_state: { name: checkName, state: checkState } },
        });
        if (duplicate && duplicate.id !== id) {
          return NextResponse.json(
            { error: "A territory with this name and state already exists" },
            { status: 409 }
          );
        }
      }
    }

    const territory = await db.market.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ territory });
  } catch (error) {
    console.error("Error updating territory:", error);
    return NextResponse.json(
      { error: "Failed to update territory" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/territories/[id] - Delete territory (only if unassigned)
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

    const territory = await db.market.findUnique({ where: { id } });

    if (!territory) {
      return NextResponse.json(
        { error: "Territory not found" },
        { status: 404 }
      );
    }

    if (territory.franchiseeAccountId) {
      return NextResponse.json(
        {
          error:
            "Cannot delete a territory that is assigned to a franchisee. Unassign it first.",
        },
        { status: 400 }
      );
    }

    await db.market.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting territory:", error);
    return NextResponse.json(
      { error: "Failed to delete territory" },
      { status: 500 }
    );
  }
}
