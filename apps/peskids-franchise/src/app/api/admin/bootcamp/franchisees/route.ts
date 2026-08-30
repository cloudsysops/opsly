import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim() || "";
    const filter = searchParams.get("filter") || "all"; // all, in_progress, completed, not_started
    const sort = searchParams.get("sort") || "name"; // name, progress, last_activity

    // Get date range for activity check
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get total modules for percentage calculation
    const totalModules = await db.academyModule.count();

    // Get all phases for determining current phase
    const phases = await db.academyPhase.findMany({
      include: {
        modules: {
          select: { id: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    // Build search condition
    const searchCondition = search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    // Get franchisees
    const franchisees = await db.prospect.findMany({
      where: {
        pipelineStage: "SELECTED",
        ...searchCondition,
      },
      include: {
        academyProgress: {
          select: {
            moduleId: true,
            status: true,
            completedAt: true,
          },
        },
        dailyActivity: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
        earnedBadges: {
          select: { id: true },
        },
      },
    });

    // Calculate progress for each franchisee
    let processedFranchisees = franchisees.map((f) => {
      const completedModules = f.academyProgress.filter(
        (p) => p.status === "COMPLETED"
      ).length;
      const percentage =
        totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

      // Determine current phase
      let currentPhase = phases[0]?.title || "Not Started";
      for (const phase of phases) {
        const phaseModuleIds = phase.modules.map((m) => m.id);
        const phaseCompleted = phaseModuleIds.every((mId) =>
          f.academyProgress.some(
            (p) => p.moduleId === mId && p.status === "COMPLETED"
          )
        );
        if (!phaseCompleted) {
          currentPhase = phase.title;
          break;
        }
        // If all phases complete
        if (phase === phases[phases.length - 1]) {
          currentPhase = "Completed";
        }
      }

      // Get last activity date
      const lastActivity = f.dailyActivity[0]?.date || null;

      // Determine status
      let status: "not_started" | "in_progress" | "completed" = "not_started";
      if (completedModules >= totalModules && totalModules > 0) {
        status = "completed";
      } else if (completedModules > 0) {
        status = "in_progress";
      }

      // Calculate streak (simplified - just check last 7 days activity)
      const hasRecentActivity = lastActivity
        ? new Date(lastActivity) >= sevenDaysAgo
        : false;

      return {
        id: f.id,
        name: `${f.firstName} ${f.lastName}`,
        email: f.email,
        completedModules,
        totalModules,
        percentage,
        currentPhase,
        lastActivity,
        status,
        badgesEarned: f.earnedBadges.length,
        hasRecentActivity,
      };
    });

    // Apply filter
    if (filter === "in_progress") {
      processedFranchisees = processedFranchisees.filter(
        (f) => f.status === "in_progress"
      );
    } else if (filter === "completed") {
      processedFranchisees = processedFranchisees.filter(
        (f) => f.status === "completed"
      );
    } else if (filter === "not_started") {
      processedFranchisees = processedFranchisees.filter(
        (f) => f.status === "not_started"
      );
    }

    // Apply sort
    if (sort === "progress") {
      processedFranchisees.sort((a, b) => b.percentage - a.percentage);
    } else if (sort === "last_activity") {
      processedFranchisees.sort((a, b) => {
        if (!a.lastActivity) return 1;
        if (!b.lastActivity) return -1;
        return (
          new Date(b.lastActivity).getTime() -
          new Date(a.lastActivity).getTime()
        );
      });
    } else {
      // Default: sort by name
      processedFranchisees.sort((a, b) => a.name.localeCompare(b.name));
    }

    return NextResponse.json({
      franchisees: processedFranchisees,
      totalModules,
      totalPhases: phases.length,
    });
  } catch (error) {
    console.error("Franchisees list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch franchisees" },
      { status: 500 }
    );
  }
}
