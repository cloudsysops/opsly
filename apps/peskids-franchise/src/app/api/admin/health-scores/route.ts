import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    // Get all health scores for this period
    const healthScores = await prisma.healthScore.findMany({
      where: { year, month },
      include: {
        franchiseeAccount: {
          include: {
            prospect: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { compositeScore: "desc" },
    });

    const scores = healthScores.map((hs) => ({
      id: hs.id,
      franchiseeAccountId: hs.franchiseeAccountId,
      franchiseeName: `${hs.franchiseeAccount.prospect.firstName} ${hs.franchiseeAccount.prospect.lastName}`,
      franchiseeEmail: hs.franchiseeAccount.prospect.email,
      year: hs.year,
      month: hs.month,
      financialScore: hs.financialScore,
      operationalScore: hs.operationalScore,
      complianceScore: hs.complianceScore,
      engagementScore: hs.engagementScore,
      growthScore: hs.growthScore,
      compositeScore: hs.compositeScore,
      riskLevel: hs.riskLevel,
      trend: hs.trend,
      previousScore: hs.previousScore,
      riskFactors: hs.riskFactors as any[] || [],
      recommendations: hs.recommendations as any[] || [],
    }));

    return NextResponse.json({ scores });
  } catch (error) {
    console.error("Failed to fetch health scores:", error);
    return NextResponse.json({ error: "Failed to fetch health scores" }, { status: 500 });
  }
}
