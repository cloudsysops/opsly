import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/franchisees/[id]/territories - List territories assigned to a franchisee
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Get the franchisee account for this prospect
    const prospect = await db.prospect.findUnique({
      where: { id },
      include: {
        franchiseeAccount: {
          include: {
            markets: {
              orderBy: { assignedAt: "desc" },
            },
          },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json(
        { error: "Franchisee not found" },
        { status: 404 }
      );
    }

    if (!prospect.franchiseeAccount) {
      return NextResponse.json(
        { error: "Franchisee account not found" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      territories: prospect.franchiseeAccount.markets,
      franchiseeAccountId: prospect.franchiseeAccount.id,
      isMultiUnit: prospect.franchiseeAccount.isMultiUnit,
      operatorType: prospect.franchiseeAccount.operatorType,
    });
  } catch (error) {
    console.error("Error fetching territories:", error);
    return NextResponse.json(
      { error: "Failed to fetch territories" },
      { status: 500 }
    );
  }
}

// POST /api/admin/franchisees/[id]/territories - Assign a new territory to a franchisee
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { marketId } = body;

    if (!marketId) {
      return NextResponse.json(
        { error: "marketId is required" },
        { status: 400 }
      );
    }

    // Get the franchisee account
    const prospect = await db.prospect.findUnique({
      where: { id },
      include: {
        franchiseeAccount: {
          include: {
            markets: true,
          },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json(
        { error: "Franchisee not found" },
        { status: 404 }
      );
    }

    if (!prospect.franchiseeAccount) {
      return NextResponse.json(
        { error: "Franchisee account not found" },
        { status: 400 }
      );
    }

    // Verify market exists and is available
    const market = await db.market.findUnique({ where: { id: marketId } });

    if (!market) {
      return NextResponse.json(
        { error: "Market not found" },
        { status: 404 }
      );
    }

    if (
      market.franchiseeAccountId &&
      market.franchiseeAccountId !== prospect.franchiseeAccount.id
    ) {
      return NextResponse.json(
        { error: "Market is already assigned to another franchisee" },
        { status: 409 }
      );
    }

    const franchiseeAccountId = prospect.franchiseeAccount.id;
    const currentTerritoryCount = prospect.franchiseeAccount.markets.length;

    // Assign the market to the franchisee
    const updatedMarket = await db.market.update({
      where: { id: marketId },
      data: {
        franchiseeAccountId,
        status: "SOLD",
        assignedAt: new Date(),
      },
    });

    // If franchisee now has 2+ territories, auto-set isMultiUnit
    if (currentTerritoryCount + 1 >= 2) {
      await db.franchiseeAccount.update({
        where: { id: franchiseeAccountId },
        data: {
          isMultiUnit: true,
          operatorType:
            prospect.franchiseeAccount.operatorType === "SINGLE_UNIT"
              ? "MULTI_UNIT"
              : prospect.franchiseeAccount.operatorType,
        },
      });
    }

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: id,
        activityType: "NOTE_ADDED",
        description: `Territory assigned: ${updatedMarket.name}, ${updatedMarket.state}`,
        performedBy: session.user.email || undefined,
      },
    });

    return NextResponse.json(
      {
        territory: updatedMarket,
        isMultiUnit: currentTerritoryCount + 1 >= 2,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error assigning territory:", error);
    return NextResponse.json(
      { error: "Failed to assign territory" },
      { status: 500 }
    );
  }
}
