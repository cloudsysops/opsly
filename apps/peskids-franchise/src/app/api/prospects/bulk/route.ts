import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bulkActionSchema = z.object({
  action: z.enum(["delete", "reject"]),
  prospectIds: z.array(z.string()).min(1, "At least one prospect ID is required"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Only ADMIN can perform bulk actions
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, prospectIds } = bulkActionSchema.parse(body);

    if (action === "delete") {
      // Delete all selected prospects
      const result = await db.prospect.deleteMany({
        where: {
          id: { in: prospectIds },
        },
      });

      console.log(
        `Bulk delete by ${session.user.email}: ${result.count} prospects deleted`
      );

      return NextResponse.json({
        success: true,
        action: "delete",
        count: result.count,
      });
    }

    if (action === "reject") {
      // Update all selected prospects to REJECTED stage
      const result = await db.prospect.updateMany({
        where: {
          id: { in: prospectIds },
        },
        data: {
          pipelineStage: "REJECTED",
        },
      });

      // Log activity for each prospect
      await db.prospectActivity.createMany({
        data: prospectIds.map((prospectId) => ({
          prospectId,
          activityType: "STAGE_CHANGED" as const,
          description: "Bulk action: Stage changed to REJECTED",
          performedBy: session.user.email || undefined,
          metadata: {
            action: "bulk_reject",
            newStage: "REJECTED",
          },
        })),
      });

      console.log(
        `Bulk reject by ${session.user.email}: ${result.count} prospects rejected`
      );

      return NextResponse.json({
        success: true,
        action: "reject",
        count: result.count,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in bulk action:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
