import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// PUT - Batch reorder phases, modules, or blocks
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, items } = body;

    // items: Array of { id: string, order: number }
    if (!type || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "type and items[] are required" },
        { status: 400 }
      );
    }

    if (!["phases", "modules", "blocks"].includes(type)) {
      return NextResponse.json(
        { error: "type must be phases, modules, or blocks" },
        { status: 400 }
      );
    }

    // Batch update in a transaction
    await db.$transaction(
      items.map((item: { id: string; order: number }) => {
        switch (type) {
          case "phases":
            return db.academyPhase.update({
              where: { id: item.id },
              data: { order: item.order },
            });
          case "modules":
            return db.academyModule.update({
              where: { id: item.id },
              data: { order: item.order },
            });
          case "blocks":
            return db.contentBlock.update({
              where: { id: item.id },
              data: { order: item.order },
            });
          default:
            throw new Error("Invalid type");
        }
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder error:", error);
    return NextResponse.json(
      { error: "Failed to reorder" },
      { status: 500 }
    );
  }
}
