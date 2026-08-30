import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/franchisee/bootcamp/achievements - Get achievements data for franchisee
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get prospect
    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Verify franchisee access (SELECTED stage only)
    if (prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json(
        { error: "Academy access requires SELECTED status" },
        { status: 403 }
      );
    }

    // Get all badges
    const allBadges = await db.academyBadge.findMany({
      orderBy: { points: "asc" },
    });

    // Get earned badges for this prospect
    const earnedBadgeRecords = await db.earnedBadge.findMany({
      where: { prospectId: prospect.id },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    });

    const earnedBadgeIds = new Set(earnedBadgeRecords.map((eb) => eb.badgeId));

    // Separate earned and locked badges
    const earnedBadges = earnedBadgeRecords.map((eb) => ({
      id: eb.badge.id,
      slug: eb.badge.slug,
      title: eb.badge.title,
      description: eb.badge.description,
      imageUrl: eb.badge.imageUrl,
      points: eb.badge.points,
      criteria: eb.badge.criteria,
      earnedAt: eb.earnedAt,
    }));

    const lockedBadges = allBadges
      .filter((badge) => !earnedBadgeIds.has(badge.id))
      .map((badge) => ({
        id: badge.id,
        slug: badge.slug,
        title: badge.title,
        description: badge.description,
        imageUrl: badge.imageUrl,
        points: badge.points,
        criteria: badge.criteria,
      }));

    // Calculate total points from points log
    const pointsAggregate = await db.academyPointsLog.aggregate({
      where: { prospectId: prospect.id },
      _sum: { points: true },
    });
    const totalPoints = pointsAggregate._sum.points || 0;

    // Get recent points log entries (last 50)
    const recentPointsLog = await db.academyPointsLog.findMany({
      where: { prospectId: prospect.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Calculate streaks
    // A streak is defined as consecutive days with activity
    const activityDates = recentPointsLog
      .map((log) => {
        const date = new Date(log.createdAt);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      })
      .filter((value, index, self) => self.indexOf(value) === index) // unique dates
      .sort()
      .reverse(); // most recent first

    let currentStreak = 0;
    let longestStreak = 0;

    if (activityDates.length > 0) {
      // Check if there was activity today or yesterday (to count as current streak)
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

      const hasRecentActivity = activityDates[0] === todayStr || activityDates[0] === yesterdayStr;

      if (hasRecentActivity) {
        // Calculate current streak
        let streakCount = 1;
        let checkDate = new Date(activityDates[0]);

        for (let i = 1; i < activityDates.length; i++) {
          const prevDate = new Date(checkDate);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(prevDate.getDate()).padStart(2, "0")}`;

          if (activityDates[i] === prevDateStr) {
            streakCount++;
            checkDate = prevDate;
          } else {
            break;
          }
        }
        currentStreak = streakCount;
      }

      // Calculate longest streak by examining all dates
      const sortedDates = [...activityDates].sort(); // chronological order
      let tempStreak = 1;
      longestStreak = 1;

      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);

        // Check if dates are consecutive
        const nextDay = new Date(prevDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, "0")}-${String(nextDay.getDate()).padStart(2, "0")}`;

        if (sortedDates[i] === nextDayStr) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }

      // Ensure longest streak is at least as long as current streak
      longestStreak = Math.max(longestStreak, currentStreak);
    }

    // Map points reason to human-readable labels
    const reasonLabels: Record<string, string> = {
      MODULE_COMPLETED: "Module Completed",
      QUIZ_PASSED: "Quiz Passed",
      BADGE_EARNED: "Badge Earned",
      STREAK_BONUS: "Streak Bonus",
      PHASE_COMPLETED: "Phase Completed",
      FIRST_LOGIN: "First Login",
      RESOURCE_VIEWED: "Resource Viewed",
    };

    const formattedPointsLog = recentPointsLog.map((log) => ({
      id: log.id,
      points: log.points,
      reason: log.reason,
      reasonLabel: reasonLabels[log.reason] || log.reason,
      metadata: log.metadata,
      createdAt: log.createdAt,
    }));

    // Get badge progress for locked badges
    // For phase completion badges, check how many modules are completed in that phase
    const academyProgress = await db.academyProgress.findMany({
      where: {
        prospectId: prospect.id,
        status: "COMPLETED",
      },
      include: {
        module: {
          include: {
            phase: true,
          },
        },
      },
    });

    const phases = await db.academyPhase.findMany({
      include: {
        modules: true,
      },
    });

    // Create a map of phase slug to progress
    const phaseProgress: Record<string, { completed: number; total: number }> = {};
    for (const phase of phases) {
      const completedInPhase = academyProgress.filter(
        (p) => p.module.phaseId === phase.id
      ).length;
      phaseProgress[phase.slug] = {
        completed: completedInPhase,
        total: phase.modules.length,
      };
    }

    // Add progress info to locked badges
    const lockedBadgesWithProgress = lockedBadges.map((badge) => {
      let progress = null;

      // Check if this is a phase completion badge
      if (badge.slug === "foundation-complete") {
        const p = phaseProgress["foundation"];
        if (p) {
          progress = {
            current: p.completed,
            total: p.total,
            percent: Math.round((p.completed / p.total) * 100),
          };
        }
      } else if (badge.slug === "operations-complete") {
        const p = phaseProgress["operations"];
        if (p) {
          progress = {
            current: p.completed,
            total: p.total,
            percent: Math.round((p.completed / p.total) * 100),
          };
        }
      } else if (badge.slug === "sales-marketing-complete") {
        const p = phaseProgress["sales-marketing"];
        if (p) {
          progress = {
            current: p.completed,
            total: p.total,
            percent: Math.round((p.completed / p.total) * 100),
          };
        }
      } else if (badge.slug === "launch-ready") {
        // All phases combined
        const totalModules = phases.reduce((sum, ph) => sum + ph.modules.length, 0);
        const completedModules = academyProgress.length;
        progress = {
          current: completedModules,
          total: totalModules,
          percent: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0,
        };
      }

      return {
        ...badge,
        progress,
      };
    });

    return NextResponse.json({
      earnedBadges,
      lockedBadges: lockedBadgesWithProgress,
      totalPoints,
      earnedBadgesCount: earnedBadges.length,
      totalBadgesCount: allBadges.length,
      currentStreak,
      longestStreak,
      recentPointsLog: formattedPointsLog,
    });
  } catch (error) {
    console.error("Franchisee achievements error:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements data" },
      { status: 500 }
    );
  }
}
