import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/admin/territories/[id]/assign - Assign territory to a franchisee
export async function POST(
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
    const { franchiseeAccountId } = body;

    if (!franchiseeAccountId) {
      return NextResponse.json(
        { error: "franchiseeAccountId is required" },
        { status: 400 }
      );
    }

    // Verify territory exists
    const territory = await db.market.findUnique({ where: { id } });
    if (!territory) {
      return NextResponse.json(
        { error: "Territory not found" },
        { status: 404 }
      );
    }

    if (territory.franchiseeAccountId) {
      return NextResponse.json(
        { error: "Territory is already assigned to a franchisee" },
        { status: 400 }
      );
    }

    // Verify franchisee account exists and get prospect info
    const franchiseeAccount = await db.franchiseeAccount.findUnique({
      where: { id: franchiseeAccountId },
      include: {
        prospect: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!franchiseeAccount) {
      return NextResponse.json(
        { error: "Franchisee account not found" },
        { status: 404 }
      );
    }

    // Assign territory and update status
    const updatedTerritory = await db.market.update({
      where: { id },
      data: {
        franchiseeAccountId,
        status: "SOLD",
        assignedAt: new Date(),
      },
      include: {
        franchiseeAccount: {
          include: {
            prospect: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Log activity on the prospect
    await db.prospectActivity.create({
      data: {
        prospectId: franchiseeAccount.prospectId,
        activityType: "STAGE_CHANGED",
        description: `Territory "${territory.name}, ${territory.state}" assigned`,
        metadata: {
          territoryId: id,
          territoryName: territory.name,
          territoryState: territory.state,
          action: "territory_assigned",
        },
        performedBy: session.user.email,
      },
    });

    return NextResponse.json({ territory: updatedTerritory });
  } catch (error) {
    console.error("Error assigning territory:", error);
    return NextResponse.json(
      { error: "Failed to assign territory" },
      { status: 500 }
    );
  }
}
