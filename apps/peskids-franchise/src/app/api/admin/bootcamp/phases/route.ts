import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List all phases with modules
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const phases = await db.academyPhase.findMany({
      include: {
        modules: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ phases });
  } catch (error) {
    console.error("Phases list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch phases" },
      { status: 500 }
    );
  }
}

// POST - Create a new phase
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, duration, imageUrl, programId, dayStart, dayEnd } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check for existing slug
    const existing = await db.academyPhase.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A phase with this title already exists" },
        { status: 400 }
      );
    }

    // Get next sequence number
    const lastPhase = await db.academyPhase.findFirst({
      orderBy: { order: "desc" },
    });
    const nextSequence = (lastPhase?.order || 0) + 1;

    const phase = await db.academyPhase.create({
      data: {
        slug,
        title,
        description: description || undefined,
        duration: duration || undefined,
        imageUrl,
        order: nextSequence,
        programId: programId || undefined,
        dayStart: dayStart || undefined,
        dayEnd: dayEnd || undefined,
      },
    });

    return NextResponse.json({ phase }, { status: 201 });
  } catch (error) {
    console.error("Phase create error:", error);
    return NextResponse.json(
      { error: "Failed to create phase" },
      { status: 500 }
    );
  }
}
