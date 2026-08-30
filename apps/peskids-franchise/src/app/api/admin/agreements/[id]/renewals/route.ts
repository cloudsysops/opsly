import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST initiate a renewal
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: agreementId } = await params;

    const agreement = await prisma.franchiseAgreement.findUnique({
      where: { id: agreementId },
      include: {
        renewals: { orderBy: { renewalNumber: "desc" }, take: 1 },
        franchiseeAccount: {
          include: {
            prospect: true,
          },
        },
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: "Agreement not found" }, { status: 404 });
    }

    // Check if there's already a pending renewal
    const pendingRenewal = agreement.renewals.find(
      (r) => !["COMPLETED", "TERMINATED", "TRANSFERRED", "NON_RENEWAL", "DECLINED"].includes(r.status)
    );
    if (pendingRenewal) {
      return NextResponse.json(
        { error: "There is already a pending renewal for this agreement" },
        { status: 400 }
      );
    }

    // Calculate renewal number
    const renewalNumber = (agreement.renewals[0]?.renewalNumber || 0) + 1;

    // Calculate new effective date (when current term ends)
    const effectiveDate = new Date(agreement.endDate);

    // Calculate response deadline (based on renewal notice period)
    const responseDeadline = new Date(effectiveDate);
    responseDeadline.setMonth(responseDeadline.getMonth() - (agreement.renewalNoticeMonths || 6));

    const renewal = await prisma.agreementRenewal.create({
      data: {
        agreementId,
        renewalNumber,
        initiatedBy: session.user.email || "SYSTEM",
        notificationSentAt: new Date(),
        responseDeadline,
        effectiveDate,
        newTermYears: agreement.renewalTermYears,
        renewalFee: agreement.renewalFee,
        status: "NOTICE_SENT",
      },
    });

    // Update agreement status
    await prisma.franchiseAgreement.update({
      where: { id: agreementId },
      data: { status: "RENEWAL_IN_PROGRESS" },
    });

    return NextResponse.json({ renewal });
  } catch (error) {
    console.error("Failed to initiate renewal:", error);
    return NextResponse.json({ error: "Failed to initiate renewal" }, { status: 500 });
  }
}
