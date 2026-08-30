import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Full content tree for a program (phases → modules → contentBlocks)
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

    const program = await db.academyProgram.findUnique({
      where: { id },
      include: {
        academyPhases: {
          orderBy: { order: "asc" },
          include: {
            modules: {
              orderBy: { order: "asc" },
              include: {
                contentBlocks: {
                  orderBy: { order: "asc" },
                },
                _count: {
                  select: { contentBlocks: true },
                },
              },
            },
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    return NextResponse.json({ program });
  } catch (error) {
    console.error("Program tree error:", error);
    return NextResponse.json(
      { error: "Failed to fetch program tree" },
      { status: 500 }
    );
  }
}
