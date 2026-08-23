import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ResourceCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET - List all resources
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");

    const resources = await db.academyResource.findMany({
      where: category ? { category: category as ResourceCategory } : undefined,
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });

    return NextResponse.json({ resources });
  } catch (error) {
    console.error("Resources list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch resources" },
      { status: 500 }
    );
  }
}

// POST - Create a new resource
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      fileUrl,
      externalUrl,
      content,
      isPublic,
    } = body;

    if (!title || !description || !category) {
      return NextResponse.json(
        { error: "Title, description, and category are required" },
        { status: 400 }
      );
    }

    // Validate category
    if (!Object.values(ResourceCategory).includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    // Generate slug from title
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    let slug = baseSlug;
    let counter = 1;
    while (await db.academyResource.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const resource = await db.academyResource.create({
      data: {
        slug,
        title,
        description,
        category: category as ResourceCategory,
        fileUrl,
        externalUrl,
        content,
        isPublic: isPublic ?? false,
      },
    });

    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    console.error("Resource create error:", error);
    return NextResponse.json(
      { error: "Failed to create resource" },
      { status: 500 }
    );
  }
}
