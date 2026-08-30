import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the franchisee with all their progress
    const franchisee = await db.prospect.findUnique({
      where: { id },
      include: {
        academyProgress: {
          include: {
            module: {
              include: {
                phase: {
                  select: {
                    id: true,
                    title: true,
                    order: true,
                  },
                },
              },
            },
          },
        },
        earnedBadges: {
          include: {
            badge: true,
          },
          orderBy: { earnedAt: "desc" },
        },
        dailyActivity: {
          orderBy: { date: "desc" },
          take: 30,
          select: { date: true },
        },
      },
    });

    if (!franchisee) {
      return NextResponse.json({ error: "Franchisee not found" }, { status: 404 });
    }

    // Get all phases with modules
    const phases = await db.academyPhase.findMany({
      include: {
        modules: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    // Build detailed progress by phase
    const phaseProgress = phases.map((phase) => {
      const moduleProgress = phase.modules.map((module) => {
        const progress = franchisee.academyProgress.find(
          (p) => p.moduleId === module.id
        );
        return {
          id: module.id,
          title: module.title,
          type: module.moduleType,
          points: module.points,
          duration: module.duration,
          status: progress?.status || "NOT_STARTED",
          score: progress?.score,
          completedAt: progress?.completedAt,
          timeSpent: progress?.timeSpent,
        };
      });

      const completedInPhase = moduleProgress.filter(
        (m) => m.status === "COMPLETED"
      ).length;
      const totalInPhase = moduleProgress.length;
      const phasePercentage =
        totalInPhase > 0 ? Math.round((completedInPhase / totalInPhase) * 100) : 0;

      return {
        id: phase.id,
        title: phase.title,
        description: phase.description,
        duration: phase.duration,
        order: phase.order,
        modules: moduleProgress,
        completedModules: completedInPhase,
        totalModules: totalInPhase,
        percentage: phasePercentage,
      };
    });

    // Calculate overall stats
    const totalModules = phases.reduce((sum, p) => sum + p.modules.length, 0);
    const completedModules = franchisee.academyProgress.filter(
      (p) => p.status === "COMPLETED"
    ).length;
    const overallPercentage =
      totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    // Calculate total points earned
    const totalPoints = franchisee.academyProgress.reduce((sum, p) => {
      if (p.status === "COMPLETED") {
        return sum + (p.module.points || 0);
      }
      return sum;
    }, 0);

    // Calculate total time spent
    const totalTimeSpent = franchisee.academyProgress.reduce((sum, p) => {
      return sum + (p.timeSpent || 0);
    }, 0);

    // Calculate streak
    const activityDates = franchisee.dailyActivity.map((a) =>
      new Date(a.date).toISOString().split("T")[0]
    );
    let currentStreak = 0;
    if (activityDates.length > 0) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const mostRecent = new Date(activityDates[0]);
      mostRecent.setUTCHours(0, 0, 0, 0);

      if (mostRecent >= yesterday) {
        currentStreak = 1;
        let expectedDate = new Date(mostRecent);
        expectedDate.setDate(expectedDate.getDate() - 1);

        for (let i = 1; i < activityDates.length; i++) {
          const actDate = new Date(activityDates[i]);
          actDate.setUTCHours(0, 0, 0, 0);
          if (actDate.getTime() === expectedDate.getTime()) {
            currentStreak++;
            expectedDate.setDate(expectedDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    // Format response
    const response = {
      id: franchisee.id,
      name: `${franchisee.firstName} ${franchisee.lastName}`,
      email: franchisee.email,
      phone: franchisee.phone,
      territory: franchisee.preferredTerritory,
      joinedAt: franchisee.createdAt,
      stats: {
        completedModules,
        totalModules,
        overallPercentage,
        totalPoints,
        totalTimeSpent,
        currentStreak,
        badgesEarned: franchisee.earnedBadges.length,
      },
      phases: phaseProgress,
      badges: franchisee.earnedBadges.map((eb) => ({
        id: eb.badge.id,
        title: eb.badge.title,
        description: eb.badge.description,
        imageUrl: eb.badge.imageUrl,
        earnedAt: eb.earnedAt,
      })),
      recentActivity: franchisee.dailyActivity.slice(0, 14).map((a) => ({
        date: a.date,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Franchisee detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch franchisee details" },
      { status: 500 }
    );
  }
}
