import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List enrollments with progress + available franchisees
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const programId = params.id;

    // Fetch enrollments and total module count in parallel
    const [enrollments, totalModules] = await Promise.all([
      db.programEnrollment.findMany({
        where: { programId },
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
        orderBy: { enrolledAt: "desc" },
      }),
      db.academyModule.count({
        where: {
          phase: { programId },
        },
      }),
    ]);

    // Get completed module counts for all enrolled prospects in one query
    const enrolledProspectIds = enrollments.map((e) => e.prospectId);

    const [progressCounts, availableFranchisees] = await Promise.all([
      enrolledProspectIds.length > 0
        ? db.academyProgress.groupBy({
            by: ["prospectId"],
            where: {
              prospectId: { in: enrolledProspectIds },
              status: "COMPLETED",
              module: {
                phase: { programId },
              },
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.prospect.findMany({
        where: {
          pipelineStage: "SELECTED",
          id: { notIn: enrolledProspectIds },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
        orderBy: { lastName: "asc" },
      }),
    ]);

    // Build a lookup map for completed counts
    const completedMap = new Map(
      progressCounts.map((p) => [p.prospectId, p._count.id])
    );

    const enrichedEnrollments = enrollments.map((enrollment) => {
      const completedModules = completedMap.get(enrollment.prospectId) || 0;
      return {
        ...enrollment,
        completedModules,
        totalModules,
        progressPercentage:
          totalModules > 0
            ? Math.round((completedModules / totalModules) * 100)
            : 0,
      };
    });

    return NextResponse.json({
      enrollments: enrichedEnrollments,
      availableFranchisees,
    });
  } catch (error) {
    console.error("Enrollment list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrollments" },
      { status: 500 }
    );
  }
}

// POST - Enroll franchisees in a program
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const programId = params.id;
    const body = await request.json();
    const { prospectIds } = body;

    if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
      return NextResponse.json(
        { error: "prospectIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Verify program exists
    const program = await db.academyProgram.findUnique({
      where: { id: programId },
    });

    if (!program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }

    // Upsert each enrollment using the compound unique constraint
    const results = await Promise.all(
      prospectIds.map((prospectId: string) =>
        db.programEnrollment.upsert({
          where: {
            prospectId_programId: { prospectId, programId },
          },
          create: {
            prospectId,
            programId,
            status: "ENROLLED",
          },
          update: {
            status: "ENROLLED",
          },
        })
      )
    );

    return NextResponse.json({ enrolled: results.length });
  } catch (error) {
    console.error("Enrollment create error:", error);
    return NextResponse.json(
      { error: "Failed to enroll franchisees" },
      { status: 500 }
    );
  }
}

// DELETE - Unenroll a franchisee from a program
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const programId = params.id;
    const { searchParams } = new URL(request.url);
    const prospectId = searchParams.get("prospectId");

    if (!prospectId) {
      return NextResponse.json(
        { error: "prospectId query parameter is required" },
        { status: 400 }
      );
    }

    await db.programEnrollment.delete({
      where: {
        prospectId_programId: { prospectId, programId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Enrollment delete error:", error);
    return NextResponse.json(
      { error: "Failed to unenroll franchisee" },
      { status: 500 }
    );
  }
}
