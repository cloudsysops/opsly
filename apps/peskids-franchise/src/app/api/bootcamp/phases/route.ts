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

    // Get all phases with modules
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

    // Enrich phases with progress data
    const enrichedPhases = phases.map((phase) => {
      const moduleProgress = phase.modules.map((module) => {
        const mp = progress.find((p) => p.moduleId === module.id);
        return {
          ...module,
          status: mp?.status || "NOT_STARTED",
          completedAt: mp?.completedAt,
        };
      });

      const completedCount = moduleProgress.filter(
        (m) => m.status === "COMPLETED"
      ).length;
      const totalModules = phase.modules.length;
      const phaseProgress =
        totalModules > 0
          ? Math.round((completedCount / totalModules) * 100)
          : 0;

      return {
        ...phase,
        modules: moduleProgress,
        completedModules: completedCount,
        totalModules,
        progress: phaseProgress,
        isComplete: completedCount === totalModules && totalModules > 0,
      };
    });

    return NextResponse.json({ phases: enrichedPhases });
  } catch (error) {
    console.error("Academy phases error:", error);
    return NextResponse.json(
      { error: "Failed to fetch phases" },
      { status: 500 }
    );
  }
}
