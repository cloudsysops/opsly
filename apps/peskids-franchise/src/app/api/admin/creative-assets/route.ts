import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List all creative assets with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const sourceType = searchParams.get("sourceType");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category;
    }

    if (sourceType) {
      where.sourceType = sourceType;
    }

    if (search) {
      where.title = {
        contains: search,
        mode: "insensitive",
      };
    }

    const assets = await db.creativeAsset.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { isOfficial: "desc" },
        { sortOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ assets });
  } catch (error) {
    console.error("Error fetching creative assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch creative assets" },
      { status: 500 }
    );
  }
}

// POST - Create a new creative asset
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
      sourceType,
      canvaDesignId,
      canvaEmbedUrl,
      canvaThumbnailUrl,
      fileUrl,
      fileName,
      fileSizeBytes,
      mimeType,
      externalUrl,
      thumbnailUrl,
      isOfficial,
      isPublic,
      sortOrder,
    } = body;

    // Validate required fields
    if (!title || !category || !sourceType) {
      return NextResponse.json(
        { error: "title, category, and sourceType are required" },
        { status: 400 }
      );
    }

    const asset = await db.creativeAsset.create({
      data: {
        title,
        description: description || null,
        category,
        sourceType,
        canvaDesignId: canvaDesignId || null,
        canvaEmbedUrl: canvaEmbedUrl || null,
        canvaThumbnailUrl: canvaThumbnailUrl || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSizeBytes: fileSizeBytes || null,
        mimeType: mimeType || null,
        externalUrl: externalUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        isOfficial: isOfficial ?? false,
        isPublic: isPublic ?? false,
        sortOrder: sortOrder ?? 0,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error("Error creating creative asset:", error);
    return NextResponse.json(
      { error: "Failed to create creative asset" },
      { status: 500 }
    );
  }
}
