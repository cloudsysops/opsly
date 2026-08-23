import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/franchisee/bootcamp - Get academy dashboard with program-based enrollments
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        pipelineStage: true,
        selectedAt: true,
        updatedAt: true,
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    if (prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json(
        { error: "Academy is only available to selected franchisees" },
        { status: 403 }
      );
    }

    // Calculate current day for onboarding programs
    const selectionDate = prospect.selectedAt || prospect.updatedAt;
    const now = new Date();
    const daysSinceSelection = Math.floor(
      (now.getTime() - selectionDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentDay = Math.min(Math.max(daysSinceSelection + 1, 1), 90);

    // Get programs the franchisee is enrolled in
    const enrollments = await db.programEnrollment.findMany({
      where: { prospectId: prospect.id },
      select: { programId: true },
    });
    const enrolledProgramIds = enrollments.map((e) => e.programId);

    // If no enrollments, return empty state
    if (enrolledProgramIds.length === 0) {
      return NextResponse.json({
        firstName: prospect.firstName,
        franchiseeName: `${prospect.firstName} ${prospect.lastName}`,
        currentDay,
        enrollments: [],
        stats: {
          totalPoints: 0,
          earnedPoints: 0,
          currentStreak: 0,
          earnedBadgesCount: 0,
          totalModulesCompleted: 0,
        },
        recentActivity: [],
      });
    }

    // Get enrolled active programs with phases and modules
    const programs = await db.academyProgram.findMany({
      where: { isActive: true, id: { in: enrolledProgramIds } },
      include: {
        academyPhases: {
          orderBy: { order: "asc" },
          include: {
            modules: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                slug: true,
                title: true,
                points: true,
                isMilestone: true,
                targetDay: true,
                owner: true,
              },
            },
          },
        },
      },
      orderBy: { sequence: "asc" },
    });

    // Get prospect's progress for all modules
    const progress = await db.academyProgress.findMany({
      where: { prospectId: prospect.id },
    });
    const progressMap = new Map(progress.map((p) => [p.moduleId, p]));

    // Get earned badges count
    const earnedBadgesCount = await db.earnedBadge.count({
      where: { prospectId: prospect.id },
    });

    // Get current streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyActivities = await db.academyDailyActivity.findMany({
      where: { prospectId: prospect.id },
      orderBy: { date: "desc" },
      take: 90,
    });

    let currentStreak = 0;
    if (dailyActivities.length > 0) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const activityDates = dailyActivities.map((a) => {
        const d = new Date(a.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      });

      const todayTime = today.getTime();
      const yesterdayTime = yesterday.getTime();

      if (activityDates.includes(todayTime) || activityDates.includes(yesterdayTime)) {
        let checkDate = activityDates.includes(todayTime) ? today : yesterday;
        while (true) {
          const checkTime = checkDate.getTime();
          if (activityDates.includes(checkTime)) {
            currentStreak++;
            checkDate = new Date(checkDate);
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    // Get points
    const pointsLog = await db.academyPointsLog.findMany({
      where: { prospectId: prospect.id },
    });
    const earnedPoints = pointsLog.reduce((sum, p) => sum + p.points, 0);

    // Build program enrollments
    let totalModulesAll = 0;
    let completedModulesAll = 0;
    let totalPointsAll = 0;

    const programEnrollments = programs.map((program) => {
      const allModules = program.academyPhases.flatMap((p) => p.modules);
      const totalModules = allModules.length;
      const completedModules = allModules.filter(
        (m) => progressMap.get(m.id)?.status === "COMPLETED"
      ).length;
      const totalPoints = allModules.reduce((sum, m) => sum + m.points, 0);
      const progressPercent =
        totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

      totalModulesAll += totalModules;
      completedModulesAll += completedModules;
      totalPointsAll += totalPoints;

      // Find next incomplete module
      let nextModule: {
        moduleSlug: string;
        phaseSlug: string;
        title: string;
        phaseTitle: string;
      } | null = null;

      for (const phase of program.academyPhases) {
        const incompleteModule = phase.modules.find(
          (m) => progressMap.get(m.id)?.status !== "COMPLETED"
        );
        if (incompleteModule) {
          nextModule = {
            moduleSlug: incompleteModule.slug,
            phaseSlug: phase.slug,
            title: incompleteModule.title,
            phaseTitle: phase.title,
          };
          break;
        }
      }

      // For onboarding programs, calculate overdue count
      let overdueCount = 0;
      if (program.programType === "ONBOARDING") {
        overdueCount = allModules.filter(
          (m) =>
            m.targetDay &&
            m.targetDay < currentDay &&
            progressMap.get(m.id)?.status !== "COMPLETED"
        ).length;
      }

      return {
        id: program.id,
        programSlug: program.slug,
        programName: program.name,
        programDescription: program.description,
        programType: program.programType,
        status:
          progressPercent === 100
            ? "COMPLETED"
            : completedModules > 0
              ? "IN_PROGRESS"
              : "ENROLLED",
        progress: progressPercent,
        completedItems: completedModules,
        totalItems: totalModules,
        overdueCount,
        nextAction: nextModule
          ? {
              title: nextModule.title,
              href: `/portal/bootcamp/${program.slug}/${nextModule.phaseSlug}/${nextModule.moduleSlug}`,
            }
          : null,
      };
    });

    // Build recent activity
    const completedProgress = progress
      .filter((p) => p.status === "COMPLETED" && p.completedAt)
      .sort(
        (a, b) =>
          new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
      )
      .slice(0, 10);

    const recentActivity: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: string;
      points?: number;
    }> = [];

    // Map module IDs to info for activity
    const allModulesFlat = programs.flatMap((p) =>
      p.academyPhases.flatMap((phase) =>
        phase.modules.map((m) => ({ ...m, phaseTitle: phase.title, phaseSlug: phase.slug }))
      )
    );
    const moduleMap = new Map(allModulesFlat.map((m) => [m.id, m]));

    for (const p of completedProgress) {
      const mod = moduleMap.get(p.moduleId);
      if (mod) {
        recentActivity.push({
          id: `module-${p.id}`,
          type: "module_completed",
          title: `Completed "${mod.title}"`,
          description: mod.phaseTitle,
          timestamp: p.completedAt!.toISOString(),
          points: mod.points,
        });
      }
    }

    // Add earned badges
    const earnedBadges = await db.earnedBadge.findMany({
      where: { prospectId: prospect.id },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
      take: 5,
    });

    for (const eb of earnedBadges) {
      recentActivity.push({
        id: `badge-${eb.id}`,
        type: "badge_earned",
        title: `Earned "${eb.badge.title}" badge`,
        description: eb.badge.description,
        timestamp: eb.earnedAt.toISOString(),
        points: eb.badge.points,
      });
    }

    recentActivity.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Calculate earned points fallback from completed modules if no points log
    const actualEarnedPoints =
      earnedPoints > 0
        ? earnedPoints
        : progress.reduce((sum, p) => {
            if (p.status === "COMPLETED") {
              const mod = moduleMap.get(p.moduleId);
              return sum + (mod?.points || 0);
            }
            return sum;
          }, 0);

    return NextResponse.json({
      firstName: prospect.firstName,
      franchiseeName: `${prospect.firstName} ${prospect.lastName}`,
      currentDay,
      enrollments: programEnrollments,
      stats: {
        totalPoints: totalPointsAll,
        earnedPoints: actualEarnedPoints,
        currentStreak,
        earnedBadgesCount,
        totalModulesCompleted: completedModulesAll,
      },
      recentActivity: recentActivity.slice(0, 5),
    });
  } catch (error) {
    console.error("Franchisee academy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch academy data" },
      { status: 500 }
    );
  }
}
