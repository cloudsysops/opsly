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

    const prospect = await db.prospect.findUnique({
      where: { id: session.user.id },
      include: {
        preWorkSubmissions: {
          select: {
            status: true,
          },
        },
        franchiseeAccount: {
          include: {
            tcSnapshots: {
              orderBy: [{ year: 'desc' }, { month: 'desc' }],
              take: 2,
            },
            invoices: {
              where: {
                status: { notIn: ['PAID', 'DRAFT', 'CANCELLED'] },
              },
            },
            certifications: {
              where: { status: 'ACTIVE' },
            },
          },
        },
        academyProgress: {
          where: { status: 'COMPLETED' },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Calculate pre-work progress
    const totalModules = await db.preWorkModule.count();
    const completedModules = prospect.preWorkSubmissions.filter(
      (s) => s.status === "SUBMITTED" || s.status === "APPROVED"
    ).length;

    const preWorkProgress = totalModules > 0
      ? Math.round((completedModules / totalModules) * 100)
      : 0;

    // Calculate health score for SELECTED franchisees
    let healthScore: number | undefined;
    if (prospect.pipelineStage === 'SELECTED' && prospect.franchiseeAccount) {
      const account = prospect.franchiseeAccount;
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Get snapshots
      const currentSnapshot = account.tcSnapshots.find(
        (s) => s.year === currentYear && s.month === currentMonth
      );
      const prevSnapshot = account.tcSnapshots.find(
        (s) => s.year !== currentYear || s.month !== currentMonth
      );

      // Financial score (simplified)
      const hasOutstandingInvoices = account.invoices.length > 0;
      const financialScore = hasOutstandingInvoices ? 60 : 90;

      // Compliance score
      const activeCerts = account.certifications.length;
      const totalCertsRequired = await db.certification.count({ where: { requiredForLaunch: true } });
      const complianceScore = totalCertsRequired > 0 ? Math.round((activeCerts / totalCertsRequired) * 100) : 100;

      // Engagement score (journey progress)
      const totalAcademyModules = await db.academyModule.count();
      const completedAcademyModules = prospect.academyProgress.length;
      const engagementScore = totalAcademyModules > 0 ? Math.round((completedAcademyModules / totalAcademyModules) * 100) : 50;

      // Growth score
      const currentRevenue = currentSnapshot ? Number(currentSnapshot.grossRevenue) : 0;
      const prevRevenue = prevSnapshot ? Number(prevSnapshot.grossRevenue) : 0;
      const growth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const growthScore = Math.min(100, Math.max(0, Math.round(50 + growth)));

      // Operational score (simplified)
      const operationalScore = 75;

      // Calculate weighted health score
      healthScore = Math.round(
        financialScore * 0.3 +
        operationalScore * 0.25 +
        complianceScore * 0.2 +
        engagementScore * 0.15 +
        growthScore * 0.1
      );
    }

    return NextResponse.json({
      id: prospect.id,
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      email: prospect.email,
      pipelineStage: prospect.pipelineStage,
      preWorkStatus: prospect.preWorkStatus,
      preWorkProgress,
      completedModules,
      totalModules,
      healthScore,
    });
  } catch (error) {
    console.error("Error fetching prospect:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
