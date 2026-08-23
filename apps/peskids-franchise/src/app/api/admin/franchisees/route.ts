import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/franchisees - List all franchisees (SELECTED prospects with FranchiseeAccount)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all SELECTED prospects with their franchisee account data
    const franchisees = await db.prospect.findMany({
      where: {
        pipelineStage: "SELECTED",
      },
      include: {
        franchiseeAccount: {
          include: {
            contacts: true,
            tcSnapshots: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            certifications: {
              include: {
                certification: true,
              },
            },
          },
        },
        academyProgress: {
          where: { status: "COMPLETED" },
        },
      },
      orderBy: {
        selectedAt: "desc",
      },
    });

    // Transform data for the frontend
    const formattedFranchisees = franchisees.map((prospect) => {
      const account = prospect.franchiseeAccount;
      const latestSnapshot = account?.tcSnapshots?.[0];
      const completedTasks = prospect.academyProgress?.length || 0;

      return {
        id: prospect.id,
        accountId: account?.id,
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        email: prospect.email,
        phone: prospect.phone,
        territory: prospect.preferredTerritory,
        selectedAt: prospect.selectedAt,

        // Business info
        llcName: account?.llcName,
        ein: account?.ein,
        launchDate: account?.launchDate,

        // Financial summary
        currentMonthRevenue: account?.currentMonthRevenue,
        ytdRevenue: account?.ytdRevenue,
        lastSyncAt: account?.lastSyncAt,

        // Activity metrics from latest snapshot
        totalLessons: latestSnapshot?.totalLessons,
        activeStudents: latestSnapshot?.activeStudents,

        // Status indicators
        stripeOnboarded: account?.stripeOnboarded || false,
        tcConnected: !!(account?.tutorCruncherBase || account?.tcInstanceUrl),

        // Academy progress
        academyModulesCompleted: completedTasks,

        // Contacts count
        contactsCount: account?.contacts?.length || 0,

        // Compliance status
        certificationsCount: account?.certifications?.length || 0,
        hasExpiredCerts: account?.certifications?.some(c => c.status === "EXPIRED") || false,
      };
    });

    return NextResponse.json({ franchisees: formattedFranchisees });
  } catch (error) {
    console.error("Error fetching franchisees:", error);
    return NextResponse.json(
      { error: "Failed to fetch franchisees" },
      { status: 500 }
    );
  }
}
