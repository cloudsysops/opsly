import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get date ranges
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all SELECTED prospects (franchisees)
    const franchisees = await db.prospect.findMany({
      where: { pipelineStage: "SELECTED" },
      include: {
        academyProgress: {
          select: {
            moduleId: true,
            status: true,
            completedAt: true,
          },
        },
        earnedBadges: {
          select: {
            id: true,
            earnedAt: true,
            badge: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { earnedAt: "desc" },
          take: 5,
        },
        dailyActivity: {
          where: {
            date: { gte: sevenDaysAgo },
          },
          select: { date: true },
        },
      },
    });

    // Get total modules count
    const totalModules = await db.academyModule.count();

    // Calculate stats
    const activeFranchisees = franchisees.length;

    // Calculate average completion percentage
    let totalCompletionPercentage = 0;
    const franchiseeCompletions = franchisees.map((f) => {
      const completed = f.academyProgress.filter((p) => p.status === "COMPLETED").length;
      const percentage = totalModules > 0 ? (completed / totalModules) * 100 : 0;
      totalCompletionPercentage += percentage;
      return {
        id: f.id,
        name: `${f.firstName} ${f.lastName}`,
        completedModules: completed,
        percentage,
      };
    });
    const avgCompletionPercentage = activeFranchisees > 0
      ? Math.round(totalCompletionPercentage / activeFranchisees)
      : 0;

    // Modules completed this week
    const modulesCompletedThisWeek = franchisees.reduce((count, f) => {
      return count + f.academyProgress.filter((p) =>
        p.status === "COMPLETED" &&
        p.completedAt &&
        new Date(p.completedAt) >= sevenDaysAgo
      ).length;
    }, 0);

    // Active learners (activity in last 7 days)
    const activeLearners = franchisees.filter((f) =>
      f.dailyActivity.length > 0
    ).length;

    // Get recent module completions
    const recentCompletions = await db.academyProgress.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { gte: sevenDaysAgo },
        prospect: { pipelineStage: "SELECTED" },
      },
      include: {
        prospect: {
          select: { firstName: true, lastName: true },
        },
        module: {
          select: { title: true },
        },
      },
      orderBy: { completedAt: "desc" },
      take: 10,
    });

    // Get recent badge earnings
    const recentBadges = await db.earnedBadge.findMany({
      where: {
        earnedAt: { gte: sevenDaysAgo },
        prospect: { pipelineStage: "SELECTED" },
      },
      include: {
        prospect: {
          select: { firstName: true, lastName: true },
        },
        badge: {
          select: { title: true },
        },
      },
      orderBy: { earnedAt: "desc" },
      take: 10,
    });

    // Combine and sort recent activity
    const recentActivity = [
      ...recentCompletions.map((c) => ({
        id: c.id,
        type: "module_completed" as const,
        prospectName: `${c.prospect.firstName} ${c.prospect.lastName}`,
        detail: c.module.title,
        timestamp: c.completedAt,
      })),
      ...recentBadges.map((b) => ({
        id: b.id,
        type: "badge_earned" as const,
        prospectName: `${b.prospect.firstName} ${b.prospect.lastName}`,
        detail: b.badge.title,
        timestamp: b.earnedAt,
      })),
    ].sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    }).slice(0, 10);

    // Find franchisees needing attention (no activity in 7+ days, not completed)
    const needsAttention = franchisees
      .filter((f) => {
        const completedCount = f.academyProgress.filter((p) => p.status === "COMPLETED").length;
        const hasRecentActivity = f.dailyActivity.length > 0;
        return completedCount < totalModules && !hasRecentActivity;
      })
      .map((f) => ({
        id: f.id,
        name: `${f.firstName} ${f.lastName}`,
        email: f.email,
        completedModules: f.academyProgress.filter((p) => p.status === "COMPLETED").length,
        totalModules,
      }))
      .slice(0, 5);

    return NextResponse.json({
      stats: {
        activeFranchisees,
        avgCompletionPercentage,
        modulesCompletedThisWeek,
        activeLearners,
        totalModules,
      },
      recentActivity,
      needsAttention,
    });
  } catch (error) {
    console.error("Academy stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch academy stats" },
      { status: 500 }
    );
  }
}
