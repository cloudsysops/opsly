import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/franchisee/bootcamp/programs/[slug] - Get program detail with phases, modules, progress
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

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
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get program with phases and modules
    const program = await db.academyProgram.findUnique({
      where: { slug },
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
                description: true,
                order: true,
                moduleType: true,
                points: true,
                duration: true,
                owner: true,
                verificationType: true,
                targetDay: true,
                isMilestone: true,
              },
            },
          },
        },
      },
    });

    if (!program || !program.isActive) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    // Get all module IDs for this program
    const allModuleIds = program.academyPhases.flatMap((p) =>
      p.modules.map((m) => m.id)
    );

    // Get prospect's progress for these modules
    const progress = await db.academyProgress.findMany({
      where: {
        prospectId: prospect.id,
        moduleId: { in: allModuleIds },
      },
    });
    const progressMap = new Map(progress.map((p) => [p.moduleId, p]));

    // Calculate current day for onboarding programs
    let currentDay = 1;
    if (program.programType === "ONBOARDING") {
      const selectionDate = prospect.selectedAt || prospect.updatedAt;
      const now = new Date();
      const daysSinceSelection = Math.floor(
        (now.getTime() - selectionDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      currentDay = Math.min(Math.max(daysSinceSelection + 1, 1), 90);
    }

    // Enrich phases with progress
    const phases = program.academyPhases.map((phase) => {
      const modules = phase.modules.map((module) => {
        const moduleProgress = progressMap.get(module.id);
        return {
          ...module,
          status: moduleProgress?.status || "NOT_STARTED",
          completedAt: moduleProgress?.completedAt,
          fileUrl: moduleProgress?.fileUrl,
          textResponse: moduleProgress?.textResponse,
        };
      });

      const completedModules = modules.filter(
        (m) => m.status === "COMPLETED"
      ).length;

      return {
        id: phase.id,
        slug: phase.slug,
        title: phase.title,
        description: phase.description,
        order: phase.order,
        dayStart: phase.dayStart,
        dayEnd: phase.dayEnd,
        imageUrl: phase.imageUrl,
        modules,
        completedModules,
        totalModules: modules.length,
        progress:
          modules.length > 0
            ? Math.round((completedModules / modules.length) * 100)
            : 0,
        isComplete: completedModules === modules.length && modules.length > 0,
      };
    });

    // Calculate overall stats
    const totalModules = allModuleIds.length;
    const completedModules = progress.filter(
      (p) => p.status === "COMPLETED"
    ).length;
    const inProgressModules = progress.filter(
      (p) => p.status === "IN_PROGRESS"
    ).length;

    // Find overdue modules (onboarding only)
    const overdueModules =
      program.programType === "ONBOARDING"
        ? program.academyPhases
            .flatMap((p) =>
              p.modules.map((m) => ({ ...m, phaseSlug: p.slug, phaseTitle: p.title }))
            )
            .filter(
              (m) =>
                m.targetDay &&
                m.targetDay < currentDay &&
                progressMap.get(m.id)?.status !== "COMPLETED"
            )
            .map((m) => ({
              id: m.id,
              slug: m.slug,
              title: m.title,
              targetDay: m.targetDay!,
              daysOverdue: currentDay - m.targetDay!,
              phaseSlug: m.phaseSlug,
              phaseTitle: m.phaseTitle,
            }))
            .sort((a, b) => b.daysOverdue - a.daysOverdue)
        : [];

    // Find next module to continue
    let nextModule: {
      slug: string;
      title: string;
      phaseSlug: string;
      phaseTitle: string;
    } | null = null;

    for (const phase of phases) {
      const incompleteModule = phase.modules.find(
        (m) => m.status !== "COMPLETED"
      );
      if (incompleteModule) {
        nextModule = {
          slug: incompleteModule.slug,
          title: incompleteModule.title,
          phaseSlug: phase.slug,
          phaseTitle: phase.title,
        };
        break;
      }
    }

    // Milestone stats
    const milestoneModules = program.academyPhases.flatMap((p) =>
      p.modules.filter((m) => m.isMilestone)
    );
    const completedMilestones = milestoneModules.filter(
      (m) => progressMap.get(m.id)?.status === "COMPLETED"
    ).length;

    return NextResponse.json({
      program: {
        id: program.id,
        slug: program.slug,
        name: program.name,
        description: program.description,
        programType: program.programType,
      },
      phases,
      stats: {
        totalModules,
        completedModules,
        inProgressModules,
        completionPercentage:
          totalModules > 0
            ? Math.round((completedModules / totalModules) * 100)
            : 0,
        totalMilestones: milestoneModules.length,
        completedMilestones,
        overdueCount: overdueModules.length,
      },
      currentDay,
      overdue: overdueModules.slice(0, 5),
      nextModule,
      franchiseeName: `${prospect.firstName} ${prospect.lastName}`,
    });
  } catch (error) {
    console.error("Program detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch program" },
      { status: 500 }
    );
  }
}
