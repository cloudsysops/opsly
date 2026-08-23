import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "PROSPECT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prospectId = session.user.id;

    // Get all badges
    const allBadges = await db.academyBadge.findMany({
      orderBy: { points: "asc" },
    });

    // Get earned badges for this prospect
    const earnedBadges = await db.earnedBadge.findMany({
      where: { prospectId },
      include: { badge: true },
    });

    const earnedBadgeIds = new Set(earnedBadges.map((eb) => eb.badgeId));

    // Combine into single list with earned status
    const badges = allBadges.map((badge) => {
      const earned = earnedBadges.find((eb) => eb.badgeId === badge.id);
      return {
        id: badge.id,
        slug: badge.slug,
        title: badge.title,
        description: badge.description,
        points: badge.points,
        criteria: badge.criteria,
        earned: earnedBadgeIds.has(badge.id),
        earnedAt: earned?.earnedAt?.toISOString() || null,
      };
    });

    // Calculate total points from earned badges
    const totalPoints = badges
      .filter((b) => b.earned)
      .reduce((sum, b) => sum + b.points, 0);

    return NextResponse.json({
      badges,
      totalPoints,
      earnedCount: earnedBadges.length,
    });
  } catch (error) {
    console.error("Achievements error:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}
