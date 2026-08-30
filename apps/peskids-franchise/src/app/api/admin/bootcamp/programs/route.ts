import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List all programs with enrollment counts
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const programs = await db.academyProgram.findMany({
      include: {
        _count: {
          select: { enrollments: true },
        },
        enrollments: {
          where: { status: "COMPLETED" },
          select: { id: true },
        },
      },
      orderBy: { sequence: "asc" },
    });

    // Format response
    const formattedPrograms = programs.map((program) => ({
      id: program.id,
      slug: program.slug,
      name: program.name,
      description: program.description,
      programType: program.programType,
      isActive: program.isActive,
      isDefault: program.isDefault,
      sequence: program.sequence,
      enrollmentCount: program._count.enrollments,
      completedCount: program.enrollments.length,
      createdAt: program.createdAt,
    }));

    return NextResponse.json({ programs: formattedPrograms });
  } catch (error) {
    console.error("Programs list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch programs" },
      { status: 500 }
    );
  }
}

// POST - Create a new program
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, programType, isActive, isDefault, sequence } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    // Generate slug from name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    let slug = baseSlug;
    let counter = 1;
    while (await db.academyProgram.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // If this is being set as default, unset other defaults of the same type
    if (isDefault) {
      await db.academyProgram.updateMany({
        where: {
          programType: programType || "ONBOARDING",
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const program = await db.academyProgram.create({
      data: {
        slug,
        name,
        description,
        programType: programType || "ONBOARDING",
        isActive: isActive !== false,
        isDefault: isDefault || false,
        sequence: sequence || 0,
      },
    });

    return NextResponse.json({ program }, { status: 201 });
  } catch (error) {
    console.error("Program create error:", error);
    return NextResponse.json(
      { error: "Failed to create program" },
      { status: 500 }
    );
  }
}
