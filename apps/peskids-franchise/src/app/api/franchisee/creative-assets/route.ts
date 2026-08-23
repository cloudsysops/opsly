import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/franchisee/creative-assets - List visible assets for this franchisee
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: { franchiseeAccount: true },
    });

    if (!prospect || prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const tab = searchParams.get("tab");
    const search = searchParams.get("search");

    // Build the where clause
    const where: any = {};

    if (tab === "my-assets") {
      where.uploadedById = prospect.id;
    } else if (tab === "brand-library") {
      where.OR = [
        { isOfficial: true },
        { isPublic: true, uploadedById: { not: prospect.id } },
      ];
    } else {
      where.OR = [
        { isOfficial: true },
        { uploadedById: prospect.id },
        { isPublic: true },
      ];
    }

    if (category) where.category = category;
    if (search) where.title = { contains: search, mode: "insensitive" };

    const assets = await db.creativeAsset.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
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

// POST /api/franchisee/creative-assets - Create own asset (franchisee upload)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: { franchiseeAccount: true },
    });

    if (!prospect || prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      sourceType,
      fileUrl,
      fileName,
      fileSizeBytes,
      mimeType,
      externalUrl,
      thumbnailUrl,
      isPublic,
    } = body;

    // Validate required fields
    if (!title || !category || !sourceType) {
      return NextResponse.json(
        { error: "title, category, and sourceType are required" },
        { status: 400 }
      );
    }

    // Franchisees can only use UPLOAD or URL source types (not CANVA)
    if (sourceType !== "UPLOAD" && sourceType !== "URL") {
      return NextResponse.json(
        { error: "sourceType must be UPLOAD or URL" },
        { status: 400 }
      );
    }

    // Validate source-specific fields
    if (sourceType === "UPLOAD" && !fileUrl) {
      return NextResponse.json(
        { error: "fileUrl is required for UPLOAD source type" },
        { status: 400 }
      );
    }

    if (sourceType === "URL" && !externalUrl) {
      return NextResponse.json(
        { error: "externalUrl is required for URL source type" },
        { status: 400 }
      );
    }

    const asset = await db.creativeAsset.create({
      data: {
        title,
        description: description || null,
        category,
        sourceType,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSizeBytes: fileSizeBytes || null,
        mimeType: mimeType || null,
        externalUrl: externalUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        isPublic: isPublic ?? false,
        isOfficial: false,
        uploadedById: prospect.id,
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
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
