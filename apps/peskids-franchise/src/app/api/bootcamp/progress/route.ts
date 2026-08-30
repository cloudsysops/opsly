import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Calculate streak from daily activity records
async function calculateStreak(prospectId: string): Promise<number> {
  // Get all activity dates for this prospect, ordered by date descending
  const activities = await db.academyDailyActivity.findMany({
    where: { prospectId },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (activities.length === 0) return 0;

  // Get today's date at midnight (UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Get yesterday's date at midnight (UTC)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if the most recent activity was today or yesterday
  const mostRecent = new Date(activities[0].date);
  mostRecent.setUTCHours(0, 0, 0, 0);

  // If the most recent activity wasn't today or yesterday, streak is broken
  if (mostRecent < yesterday) {
    return 0;
  }

  // Count consecutive days
  let streak = 0;
  let expectedDate = mostRecent;

  for (const activity of activities) {
    const activityDate = new Date(activity.date);
    activityDate.setUTCHours(0, 0, 0, 0);

    // Compare dates
    if (activityDate.getTime() === expectedDate.getTime()) {
      streak++;
      expectedDate = new Date(expectedDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (activityDate < expectedDate) {
      // Gap in streak
      break;
    }
    // Skip duplicates (same date)
  }

  return streak;
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "PROSPECT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prospectId = session.user.id;

    // Get all phases with their modules
    const phases = await db.academyPhase.findMany({
      include: {
        modules: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    // Get prospect's progress
    const progress = await db.academyProgress.findMany({
      where: { prospectId },
    });

    // Get earned badges
    const earnedBadges = await db.earnedBadge.findMany({
      where: { prospectId },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    });

    // Calculate stats
    const totalModules = phases.reduce((sum, p) => sum + p.modules.length, 0);
    const completedModules = progress.filter(
      (p) => p.status === "COMPLETED"
    ).length;
    const completionPercentage =
      totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    // Calculate total points
    const totalPoints = progress.reduce((sum, p) => {
      if (p.status === "COMPLETED") {
        const module = phases
          .flatMap((ph) => ph.modules)
          .find((m) => m.id === p.moduleId);
        return sum + (module?.points || 0);
      }
      return sum;
    }, 0);

    // Find next recommended action
    let nextAction = null;
    for (const phase of phases) {
      for (const module of phase.modules) {
        const moduleProgress = progress.find((p) => p.moduleId === module.id);
        if (!moduleProgress || moduleProgress.status !== "COMPLETED") {
          nextAction = {
            title: module.title,
            link: `/portal/learning/90-day-launch/${phase.slug}/${module.slug}`,
            phase: phase.title,
          };
          break;
        }
      }
      if (nextAction) break;
    }

    // Determine current phase
    let currentPhase = 1;
    for (let i = 0; i < phases.length; i++) {
      const phaseModules = phases[i].modules;
      const phaseCompleted = phaseModules.every((m) =>
        progress.some(
          (p) => p.moduleId === m.id && p.status === "COMPLETED"
        )
      );
      if (!phaseCompleted) {
        currentPhase = i + 1;
        break;
      }
      if (i === phases.length - 1) {
        currentPhase = phases.length;
      }
    }

    // Calculate current streak
    const currentStreak = await calculateStreak(prospectId);

    return NextResponse.json({
      status: completedModules > 0 ? "in_progress" : "not_started",
      current_phase: currentPhase,
      total_points: totalPoints,
      current_streak_days: currentStreak,
      completion_percentage: completionPercentage,
      modules_completed: completedModules,
      total_modules: totalModules,
      badges_earned: earnedBadges.length,
      recent_badges: earnedBadges.slice(0, 5).map((eb) => ({
        id: eb.badge.id,
        title: eb.badge.title,
        earnedAt: eb.earnedAt,
      })),
      next_action: nextAction,
    });
  } catch (error) {
    console.error("Academy progress error:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}
