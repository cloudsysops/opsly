import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const agreement = await db.developmentAgreement.findUnique({
      where: { id },
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
    });

    if (!agreement) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    return NextResponse.json({ agreement });
  } catch (error) {
    console.error("Failed to fetch agreement:", error);
    return NextResponse.json({ error: "Failed to fetch agreement" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { totalUnits, developmentFee, startDate, endDate, schedule, franchiseeAccountIds } = body;

    const data: any = {};
    if (totalUnits !== undefined) data.totalUnits = totalUnits;
    if (developmentFee !== undefined) data.developmentFee = developmentFee;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = new Date(endDate);
    if (schedule !== undefined) data.schedule = schedule;

    const agreement = await db.developmentAgreement.update({
      where: { id },
      data,
    });

    // Update linked franchisee accounts if provided
    if (franchiseeAccountIds !== undefined) {
      // Unlink all existing accounts
      await db.franchiseeAccount.updateMany({
        where: { developmentAgreementId: id },
        data: { developmentAgreementId: null },
      });

      // Link new accounts
      if (franchiseeAccountIds.length > 0) {
        await db.franchiseeAccount.updateMany({
          where: { id: { in: franchiseeAccountIds } },
          data: { developmentAgreementId: id },
        });
      }
    }

    const fullAgreement = await db.developmentAgreement.findUnique({
      where: { id },
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
    console.error("Failed to update agreement:", error);
    return NextResponse.json({ error: "Failed to update agreement" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Unlink all franchisee accounts first
    await db.franchiseeAccount.updateMany({
      where: { developmentAgreementId: id },
      data: { developmentAgreementId: null },
    });

    // Delete the agreement
    await db.developmentAgreement.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete agreement:", error);
    return NextResponse.json({ error: "Failed to delete agreement" }, { status: 500 });
  }
}
