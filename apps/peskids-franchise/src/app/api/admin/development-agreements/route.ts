import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const agreements = await db.developmentAgreement.findMany({
      include: {
        franchiseeAccounts: {
          include: {
            prospect: {
              select: { firstName: true, lastName: true, email: true },
            },
            markets: {
              select: { id: true, name: true, state: true, status: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ agreements });
  } catch (error) {
    console.error("Failed to fetch development agreements:", error);
    return NextResponse.json({ error: "Failed to fetch agreements" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { totalUnits, developmentFee, startDate, endDate, schedule, franchiseeAccountIds } = body;

    if (!totalUnits || !developmentFee || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create the agreement
    const agreement = await db.developmentAgreement.create({
      data: {
        totalUnits,
        developmentFee,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        schedule: schedule || [],
      },
    });

    // Link franchisee accounts if provided
    if (franchiseeAccountIds && franchiseeAccountIds.length > 0) {
      await db.franchiseeAccount.updateMany({
        where: { id: { in: franchiseeAccountIds } },
        data: { developmentAgreementId: agreement.id },
      });
    }

    // Fetch the full agreement with relations
    const fullAgreement = await db.developmentAgreement.findUnique({
      where: { id: agreement.id },
      include: {
        franchiseeAccounts: {
          include: {
            prospect: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ agreement: fullAgreement });
  } catch (error) {
    console.error("Failed to create development agreement:", error);
    return NextResponse.json({ error: "Failed to create agreement" }, { status: 500 });
  }
}
