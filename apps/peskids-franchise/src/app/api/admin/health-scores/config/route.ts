import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET current health score configuration
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await prisma.healthScoreWeight.findFirst({
      where: { isActive: true },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Failed to fetch config:", error);
    return NextResponse.json({ error: "Failed to fetch configuration" }, { status: 500 });
  }
}

// POST create new configuration
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      financialWeight,
      operationalWeight,
      complianceWeight,
      engagementWeight,
      growthWeight,
      criticalThreshold,
      highRiskThreshold,
      elevatedThreshold,
      moderateThreshold,
    } = body;

    // Deactivate existing configs
    await prisma.healthScoreWeight.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new config
    const config = await prisma.healthScoreWeight.create({
      data: {
        financialWeight,
        operationalWeight,
        complianceWeight,
        engagementWeight,
        growthWeight,
        financialComponents: {
          revenueGrowth: 40,
          collectionRate: 30,
          profitMargin: 30,
        },
        operationalComponents: {
          lessonsDelivered: 40,
          studentRetention: 30,
          tutorUtilization: 30,
        },
        complianceComponents: {
          certifications: 50,
          audits: 30,
          documents: 20,
        },
        engagementComponents: {
          academyProgress: 40,
          supportTickets: 30,
          communication: 30,
        },
        growthComponents: {
          newStudents: 50,
          marketExpansion: 30,
          revenueGrowth: 20,
        },
        criticalThreshold,
        highRiskThreshold,
        elevatedThreshold,
        moderateThreshold,
        isActive: true,
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Failed to create config:", error);
    return NextResponse.json({ error: "Failed to create configuration" }, { status: 500 });
  }
}

// PATCH update existing configuration
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Get existing active config
    const existing = await prisma.healthScoreWeight.findFirst({
      where: { isActive: true },
    });

    if (!existing) {
      // If no existing config, create new one
      return POST(req);
    }

    // Update the existing config
    const config = await prisma.healthScoreWeight.update({
      where: { id: existing.id },
      data: body,
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Failed to update config:", error);
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
  }
}
