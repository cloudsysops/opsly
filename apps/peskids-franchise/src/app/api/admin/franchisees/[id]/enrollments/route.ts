import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List enrollments for a franchisee
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const enrollments = await db.programEnrollment.findMany({
      where: { prospectId: params.id },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            slug: true,
            programType: true,
            isActive: true,
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    // Also return available programs (active, not already enrolled)
    const enrolledProgramIds = enrollments.map((e) => e.programId);
    const availablePrograms = await db.academyProgram.findMany({
      where: {
        isActive: true,
        id: { notIn: enrolledProgramIds },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        programType: true,
      },
      orderBy: { sequence: "asc" },
    });

    return NextResponse.json({ enrollments, availablePrograms });
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrollments" },
      { status: 500 }
    );
  }
}

// POST - Enroll a franchisee in a program
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { programId } = await request.json();

    if (!programId) {
      return NextResponse.json(
        { error: "programId is required" },
        { status: 400 }
      );
    }

    // Verify prospect exists and is SELECTED
    const prospect = await db.prospect.findUnique({
      where: { id: params.id },
      select: { id: true, firstName: true, lastName: true, pipelineStage: true },
    });

    if (!prospect || prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json(
        { error: "Franchisee not found or not selected" },
        { status: 404 }
      );
    }

    // Verify program exists and is active
    const program = await db.academyProgram.findUnique({
      where: { id: programId },
      select: { id: true, name: true, isActive: true },
    });

    if (!program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }

    // Create enrollment (unique constraint will prevent duplicates)
    const enrollment = await db.programEnrollment.create({
      data: {
        prospectId: params.id,
        programId,
      },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            slug: true,
            programType: true,
            isActive: true,
          },
        },
      },
    });

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: params.id,
        activityType: "NOTE_ADDED",
        description: `Enrolled in program: ${program.name}`,
        performedBy: session.user.email || undefined,
      },
    });

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error: unknown) {
    // Handle unique constraint violation
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Franchisee is already enrolled in this program" },
        { status: 400 }
      );
    }
    console.error("Error creating enrollment:", error);
    return NextResponse.json(
      { error: "Failed to create enrollment" },
      { status: 500 }
    );
  }
}

// DELETE - Remove an enrollment
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { enrollmentId } = await request.json();

    if (!enrollmentId) {
      return NextResponse.json(
        { error: "enrollmentId is required" },
        { status: 400 }
      );
    }

    const enrollment = await db.programEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { program: { select: { name: true } } },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    await db.programEnrollment.delete({
      where: { id: enrollmentId },
    });

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: enrollment.prospectId,
        activityType: "NOTE_ADDED",
        description: `Removed from program: ${enrollment.program.name}`,
        performedBy: session.user.email || undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting enrollment:", error);
    return NextResponse.json(
      { error: "Failed to remove enrollment" },
      { status: 500 }
    );
  }
}
