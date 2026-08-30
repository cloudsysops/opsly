import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/territories - List all territories with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { state: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [territories, total] = await Promise.all([
      db.market.findMany({
        where,
        include: {
          franchiseeAccount: {
            include: {
              prospect: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: [{ state: "asc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
      db.market.count({ where }),
    ]);

    return NextResponse.json({
      territories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching territories:", error);
    return NextResponse.json(
      { error: "Failed to fetch territories" },
      { status: 500 }
    );
  }
}

// POST /api/admin/territories - Create a new territory
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      state,
      description,
      boundaryGeoJson,
      centerLat,
      centerLng,
      radiusMiles,
      status,
      boundaryType,
      travelMode,
      travelMinutes,
      zipCodes,
      color,
      notes,
      metadata,
    } = body;

    if (!name || !state) {
      return NextResponse.json(
        { error: "Name and state are required" },
        { status: 400 }
      );
    }

    // Check for duplicate name+state
    const existing = await db.market.findUnique({
      where: { name_state: { name, state } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A territory with this name and state already exists" },
        { status: 409 }
      );
    }

    const territory = await db.market.create({
      data: {
        name,
        state,
        description: description || null,
        boundaryGeoJson: boundaryGeoJson || null,
        centerLat: centerLat != null ? parseFloat(String(centerLat)) : null,
        centerLng: centerLng != null ? parseFloat(String(centerLng)) : null,
        radiusMiles: radiusMiles != null ? parseFloat(String(radiusMiles)) : null,
        status: status || "AVAILABLE",
        boundaryType: boundaryType || null,
        travelMode: travelMode || null,
        travelMinutes: travelMinutes != null ? parseInt(String(travelMinutes), 10) : null,
        zipCodes: zipCodes || [],
        color: color || null,
        notes: notes || null,
        metadata: metadata || null,
      },
    });

    return NextResponse.json({ territory }, { status: 201 });
  } catch (error) {
    console.error("Error creating territory:", error);
    return NextResponse.json(
      { error: "Failed to create territory" },
      { status: 500 }
    );
  }
}
