import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Get a single program with details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const program = await db.academyProgram.findUnique({
      where: { id: params.id },
      include: {
        enrollments: {
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
        },
        academyPhases: {
          select: {
            id: true,
            title: true,
            _count: { select: { modules: true } },
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    const moduleCount = program.academyPhases.reduce(
      (sum, phase) => sum + phase._count.modules,
      0
    );

    return NextResponse.json({ program: { ...program, moduleCount } });
  } catch (error) {
    console.error("Program detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch program" },
      { status: 500 }
    );
  }
}

// PUT - Update a program
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, programType, isActive, isDefault, sequence } = body;

    // Check if program exists
    const existing = await db.academyProgram.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    // If this is being set as default, unset other defaults of the same type
    if (isDefault && !existing.isDefault) {
      const type = programType || existing.programType;
      await db.academyProgram.updateMany({
        where: {
          programType: type,
          isDefault: true,
          id: { not: params.id },
        },
        data: { isDefault: false },
      });
    }

    // Build update data - only include fields that were provided
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (programType !== undefined) updateData.programType = programType;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (sequence !== undefined) updateData.sequence = sequence;

    const program = await db.academyProgram.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ program });
  } catch (error) {
    console.error("Program update error:", error);
    return NextResponse.json(
      { error: "Failed to update program" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a program (only if no enrollments)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check enrollment count
    const program = await db.academyProgram.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    if (program._count.enrollments > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete program with ${program._count.enrollments} enrollments. Deactivate it instead.`,
        },
        { status: 400 }
      );
    }

    await db.academyProgram.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Program delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete program" },
      { status: 500 }
    );
  }
}
