import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/multi-unit-operators - List all multi-unit operators
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all multi-unit franchisee accounts with related data
    const multiUnitAccounts = await db.franchiseeAccount.findMany({
      where: {
        isMultiUnit: true,
      },
      include: {
        prospect: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            selectedAt: true,
          },
        },
        markets: {
          select: {
            id: true,
            name: true,
            state: true,
            status: true,
            assignedAt: true,
          },
          orderBy: { assignedAt: "asc" },
        },
        tcSnapshots: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 1,
        },
        developmentAgreement: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get YTD revenue for each operator
    const currentYear = new Date().getFullYear();

    const operators = await Promise.all(
      multiUnitAccounts.map(async (account) => {
        const ytdSnapshots = await db.tutorCruncherSnapshot.findMany({
          where: {
            franchiseeAccountId: account.id,
            year: currentYear,
          },
        });

        const ytdRevenue = ytdSnapshots.reduce(
          (sum, s) => sum + Number(s.grossRevenue),
          0
        );

        const latestSnapshot = account.tcSnapshots[0];

        return {
          id: account.id,
          prospectId: account.prospect.id,
          firstName: account.prospect.firstName,
          lastName: account.prospect.lastName,
          email: account.prospect.email,
          phone: account.prospect.phone,
          selectedAt: account.prospect.selectedAt,
          llcName: account.llcName,
          operatorType: account.operatorType,
          territoryCount: account.markets.length,
          territories: account.markets,
          ytdRevenue,
          currentMonthRevenue: latestSnapshot
            ? Number(latestSnapshot.grossRevenue)
            : 0,
          stripeOnboarded: account.stripeOnboarded,
          developmentAgreement: account.developmentAgreement
            ? {
                id: account.developmentAgreement.id,
                totalUnits: account.developmentAgreement.totalUnits,
                developmentFee: Number(account.developmentAgreement.developmentFee),
                startDate: account.developmentAgreement.startDate,
                endDate: account.developmentAgreement.endDate,
                schedule: account.developmentAgreement.schedule,
              }
            : null,
        };
      })
    );

    return NextResponse.json({ operators });
  } catch (error) {
    console.error("Error fetching multi-unit operators:", error);
    return NextResponse.json(
      { error: "Failed to fetch multi-unit operators" },
      { status: 500 }
    );
  }
}
