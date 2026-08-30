import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/franchisee/bootcamp/coach/context - Get franchisee context for AI coach
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: {
        academyProgress: {
          include: {
            module: {
              include: {
                phase: {
                  include: {
                    program: { select: { slug: true, name: true, programType: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    if (prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json(
        { error: "Academy access requires SELECTED status" },
        { status: 403 }
      );
    }

    // Calculate days since selection
    const selectedAt = prospect.selectedAt || prospect.updatedAt;
    const now = new Date();
    const daysSinceSelection = Math.floor(
      (now.getTime() - selectedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentDay = Math.min(Math.max(daysSinceSelection + 1, 1), 90);

    // Get all academy modules with their programs
    const allModules = await db.academyModule.findMany({
      include: {
        phase: {
          include: {
            program: { select: { slug: true, name: true, programType: true } },
          },
        },
      },
      orderBy: [{ phase: { program: { sequence: "asc" } } }, { phase: { order: "asc" } }, { order: "asc" }],
    });

    const progressMap = new Map(
      prospect.academyProgress.map((p) => [p.moduleId, p])
    );

    // Split into onboarding and other programs
    const onboardingModules = allModules.filter(
      (m) => m.phase.program?.programType === "ONBOARDING"
    );
    const otherModules = allModules.filter(
      (m) => m.phase.program?.programType !== "ONBOARDING"
    );

    // Calculate onboarding progress
    const completedOnboarding = onboardingModules.filter(
      (m) => progressMap.get(m.id)?.status === "COMPLETED"
    );
    const onboardingPercent =
      onboardingModules.length > 0
        ? Math.round((completedOnboarding.length / onboardingModules.length) * 100)
        : 0;

    // Find current onboarding phase
    const incompleteOnboarding = onboardingModules.filter(
      (m) => progressMap.get(m.id)?.status !== "COMPLETED"
    );
    const currentPhase = incompleteOnboarding[0]?.phase || null;

    // Overdue and upcoming
    const overdueTasks = incompleteOnboarding.filter(
      (m) => m.targetDay && m.targetDay < currentDay
    );
    const upcomingTasks = incompleteOnboarding
      .filter((m) => !m.targetDay || m.targetDay >= currentDay)
      .slice(0, 3);

    // Overall academy progress
    const completedAll = allModules.filter(
      (m) => progressMap.get(m.id)?.status === "COMPLETED"
    );
    const academyPercent =
      allModules.length > 0
        ? Math.round((completedAll.length / allModules.length) * 100)
        : 0;

    // Next action
    const nextTask = incompleteOnboarding[0] || otherModules.find(
      (m) => progressMap.get(m.id)?.status !== "COMPLETED"
    );
    let nextAction = "";
    if (overdueTasks.length > 0) {
      nextAction = `Complete overdue module: "${overdueTasks[0].title}"`;
    } else if (nextTask) {
      nextAction = `Continue with: "${nextTask.title}"`;
    } else {
      nextAction = "All modules complete! Review your progress and celebrate your achievements.";
    }

    return NextResponse.json({
      franchisee: {
        name: `${prospect.firstName} ${prospect.lastName}`,
        email: prospect.email,
      },
      journey: {
        currentDay,
        totalDays: 90,
        selectedAt: selectedAt.toISOString(),
        currentPhase: currentPhase
          ? {
              name: currentPhase.title,
              dayStart: currentPhase.dayStart,
              dayEnd: currentPhase.dayEnd,
            }
          : null,
        completedTasks: completedOnboarding.length,
        totalTasks: onboardingModules.length,
        progressPercent: onboardingPercent,
        overdueTasks: overdueTasks.map((m) => ({
          title: m.title,
          targetDay: m.targetDay,
          daysOverdue: currentDay - (m.targetDay || 0),
        })),
        upcomingTasks: upcomingTasks.map((m) => ({
          title: m.title,
          targetDay: m.targetDay,
          phase: m.phase.title,
        })),
      },
      academy: {
        completedModules: completedAll.length,
        totalModules: allModules.length,
        progressPercent: academyPercent,
        currentPhase: currentPhase
          ? { title: currentPhase.title, order: currentPhase.order }
          : null,
      },
      nextAction,
    });
  } catch (error) {
    console.error("Error fetching coach context:", error);
    return NextResponse.json(
      { error: "Failed to fetch context" },
      { status: 500 }
    );
  }
}
