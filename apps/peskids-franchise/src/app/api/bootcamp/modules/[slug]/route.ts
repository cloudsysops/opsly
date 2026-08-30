import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "PROSPECT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const prospectId = session.user.id;

    const module = await db.academyModule.findUnique({
      where: { slug },
      include: {
        phase: true,
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    // Get progress for this module
    const progress = await db.academyProgress.findUnique({
      where: {
        prospectId_moduleId: {
          prospectId,
          moduleId: module.id,
        },
      },
    });

    return NextResponse.json({
      ...module,
      progress: {
        status: progress?.status || "NOT_STARTED",
        completedAt: progress?.completedAt,
        score: progress?.score,
      },
    });
  } catch (error) {
    console.error("Module fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch module" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "PROSPECT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const prospectId = session.user.id;
    const body = await request.json();
    const { action } = body;

    const module = await db.academyModule.findUnique({
      where: { slug },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    if (action === "complete") {
      // Mark module as complete
      const progress = await db.academyProgress.upsert({
        where: {
          prospectId_moduleId: {
            prospectId,
            moduleId: module.id,
          },
        },
        create: {
          prospectId,
          moduleId: module.id,
          status: "COMPLETED",
          completedAt: new Date(),
        },
        update: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      // Record daily activity for streak tracking
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await db.academyDailyActivity.upsert({
        where: {
          prospectId_date: {
            prospectId,
            date: today,
          },
        },
        create: {
          prospectId,
          date: today,
        },
        update: {},
      });

      // Check if phase is complete and award badge
      const phaseModules = await db.academyModule.findMany({
        where: { phaseId: module.phaseId },
      });

      const phaseProgress = await db.academyProgress.findMany({
        where: {
          prospectId,
          moduleId: { in: phaseModules.map((m) => m.id) },
          status: "COMPLETED",
        },
      });

      if (phaseProgress.length === phaseModules.length) {
        // Phase complete - check for badge
        const phase = await db.academyPhase.findUnique({
          where: { id: module.phaseId },
        });

        if (phase) {
          const badgeSlug = `${phase.slug}-complete`;
          const badge = await db.academyBadge.findUnique({
            where: { slug: badgeSlug },
          });

          if (badge) {
            // Award badge if not already earned
            await db.earnedBadge.upsert({
              where: {
                prospectId_badgeId: {
                  prospectId,
                  badgeId: badge.id,
                },
              },
              create: {
                prospectId,
                badgeId: badge.id,
              },
              update: {},
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        progress,
      });
    }

    if (action === "start") {
      // Mark module as in progress
      const progress = await db.academyProgress.upsert({
        where: {
          prospectId_moduleId: {
            prospectId,
            moduleId: module.id,
          },
        },
        create: {
          prospectId,
          moduleId: module.id,
          status: "IN_PROGRESS",
        },
        update: {
          status: "IN_PROGRESS",
        },
      });

      // Record daily activity for streak tracking
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await db.academyDailyActivity.upsert({
        where: {
          prospectId_date: {
            prospectId,
            date: today,
          },
        },
        create: {
          prospectId,
          date: today,
        },
        update: {},
      });

      return NextResponse.json({
        success: true,
        progress,
      });
    }

    if (action === "quiz_complete") {
      const { score } = body;

      // Mark quiz as complete with score
      const progress = await db.academyProgress.upsert({
        where: {
          prospectId_moduleId: {
            prospectId,
            moduleId: module.id,
          },
        },
        create: {
          prospectId,
          moduleId: module.id,
          status: "COMPLETED",
          completedAt: new Date(),
          score,
        },
        update: {
          status: "COMPLETED",
          completedAt: new Date(),
          score,
        },
      });

      // Record daily activity for streak tracking
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await db.academyDailyActivity.upsert({
        where: {
          prospectId_date: {
            prospectId,
            date: today,
          },
        },
        create: {
          prospectId,
          date: today,
        },
        update: {},
      });

      // Check if phase is complete and award badge
      const phaseModules = await db.academyModule.findMany({
        where: { phaseId: module.phaseId },
      });

      const phaseProgress = await db.academyProgress.findMany({
        where: {
          prospectId,
          moduleId: { in: phaseModules.map((m) => m.id) },
          status: "COMPLETED",
        },
      });

      if (phaseProgress.length === phaseModules.length) {
        const phase = await db.academyPhase.findUnique({
          where: { id: module.phaseId },
        });

        if (phase) {
          const badgeSlug = `${phase.slug}-complete`;
          const badge = await db.academyBadge.findUnique({
            where: { slug: badgeSlug },
          });

          if (badge) {
            await db.earnedBadge.upsert({
              where: {
                prospectId_badgeId: {
                  prospectId,
                  badgeId: badge.id,
                },
              },
              create: {
                prospectId,
                badgeId: badge.id,
              },
              update: {},
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        progress,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Module action error:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}
