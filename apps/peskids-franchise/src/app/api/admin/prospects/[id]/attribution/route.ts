import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProspectAttribution } from "@/lib/attribution/capture";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/prospects/[id]/attribution
 * Get attribution data for a prospect
 */
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

    const attribution = await getProspectAttribution(id);

    return NextResponse.json({ attribution });
  } catch (error) {
    console.error("[Attribution API] Error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
