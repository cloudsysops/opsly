import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET all agreements
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const franchiseeId = searchParams.get("franchiseeId");

    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (franchiseeId) {
      where.franchiseeAccountId = franchiseeId;
    }

    const agreements = await prisma.franchiseAgreement.findMany({
      where,
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
        renewals: {
          orderBy: { renewalNumber: "desc" },
          take: 5,
        },
      },
      orderBy: { endDate: "asc" },
    });

    return NextResponse.json({ agreements });
  } catch (error) {
    console.error("Failed to fetch agreements:", error);
    return NextResponse.json({ error: "Failed to fetch agreements" }, { status: 500 });
  }
}

// POST create new agreement
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      franchiseeAccountId,
      startDate,
      termYears,
      territoryDescription,
      initialFranchiseFee,
      royaltyPercent,
      brandFundPercent,
      systemsFeePercent,
      renewalTermYears,
      renewalFee,
      renewalNoticeMonths,
    } = body;

    // Validate franchisee exists
    const franchiseeAccount = await prisma.franchiseeAccount.findUnique({
      where: { id: franchiseeAccountId },
      include: {
        franchiseAgreement: true,
      },
    });

    if (!franchiseeAccount) {
      return NextResponse.json({ error: "Franchisee not found" }, { status: 404 });
    }

    if (franchiseeAccount.franchiseAgreement) {
      return NextResponse.json(
        { error: "Franchisee already has an agreement" },
        { status: 400 }
      );
    }

    // Generate agreement number
    const year = new Date().getFullYear();
    const existingCount = await prisma.franchiseAgreement.count({
      where: {
        agreementNumber: {
          startsWith: `FA-${year}-`,
        },
      },
    });
    const agreementNumber = `FA-${year}-${String(existingCount + 1).padStart(3, "0")}`;

    // Calculate end date
    const start = new Date(startDate);
    const endDate = new Date(start);
    endDate.setFullYear(endDate.getFullYear() + termYears);

    const agreement = await prisma.franchiseAgreement.create({
      data: {
        agreementNumber,
        franchiseeAccountId,
        startDate: start,
        endDate,
        termYears,
        territoryDescription: territoryDescription || null,
        exclusiveTerritory: true,
        initialFranchiseFee,
        royaltyPercent,
        brandFundPercent,
        systemsFeePercent,
        renewalTermYears,
        renewalFee: renewalFee || null,
        renewalNoticeMonths: renewalNoticeMonths || 6,
        nonRenewalNoticeMonths: renewalNoticeMonths || 6,
        status: "ACTIVE",
        signedAt: new Date(),
        signedBy: session.user.email,
      },
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
    });

    return NextResponse.json({ agreement });
  } catch (error) {
    console.error("Failed to create agreement:", error);
    return NextResponse.json({ error: "Failed to create agreement" }, { status: 500 });
  }
}
