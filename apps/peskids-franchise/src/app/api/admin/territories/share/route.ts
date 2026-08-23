import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { territoryIds, expiryDays, name } = await request.json();

    if (!territoryIds || !Array.isArray(territoryIds) || territoryIds.length === 0) {
      return NextResponse.json(
        { error: "At least one territory ID is required" },
        { status: 400 }
      );
    }

    // Verify territories exist
    const territories = await db.market.findMany({
      where: { id: { in: territoryIds } },
      select: { id: true, name: true, centerLat: true, centerLng: true },
    });

    if (territories.length === 0) {
      return NextResponse.json({ error: "No valid territories found" }, { status: 404 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = expiryDays
      ? new Date(Date.now() + expiryDays * 86400000)
      : null;

    // Calculate center from all territories
    const avgLat = territories.reduce((s, t) => s + (t.centerLat || 39.8283), 0) / territories.length;
    const avgLng = territories.reduce((s, t) => s + (t.centerLng || -98.5795), 0) / territories.length;

    const map = await db.territoryMap.create({
      data: {
        name: name || `Shared Map - ${new Date().toLocaleDateString()}`,
        centerLat: avgLat,
        centerLng: avgLng,
        zoomLevel: 6,
        isShared: true,
        shareToken: token,
        shareExpiry: expiry,
        createdBy: session.user.email || session.user.id || "unknown",
        layers: JSON.parse(JSON.stringify({ territoryIds })),
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "https://franchise-stc-993771038de6.herokuapp.com";
    const shareUrl = `${baseUrl}/share/${token}`;

    return NextResponse.json({
      id: map.id,
      token,
      url: shareUrl,
      expiresAt: expiry?.toISOString() || null,
    }, { status: 201 });
  } catch (error) {
    console.error("Share creation error:", error);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}
