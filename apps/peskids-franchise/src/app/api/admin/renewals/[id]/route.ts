import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET single renewal
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const renewal = await prisma.agreementRenewal.findUnique({
      where: { id },
      include: {
        agreement: {
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
        },
      },
    });

    if (!renewal) {
      return NextResponse.json({ error: "Renewal not found" }, { status: 404 });
    }

    return NextResponse.json({ renewal });
  } catch (error) {
    console.error("Failed to fetch renewal:", error);
    return NextResponse.json({ error: "Failed to fetch renewal" }, { status: 500 });
  }
}

// PATCH update renewal status/data
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const {
      status,
      franchiseeIntent,
      franchiseeNotes,
      franchisorDecision,
      franchisorNotes,
      newTermYears,
      renewalFee,
      feeWaived,
      feeWaivedReason,
      newRoyaltyPercent,
      terminationReason,
      terminationEffectiveAt,
      renewalAgreementUrl,
    } = body;

    const renewal = await prisma.agreementRenewal.findUnique({
      where: { id },
      include: {
        agreement: true,
      },
    });

    if (!renewal) {
      return NextResponse.json({ error: "Renewal not found" }, { status: 404 });
    }

    const updateData: any = {};

    // Status updates with associated timestamps
    if (status !== undefined) {
      updateData.status = status;

      // If completing the renewal, update the agreement
      if (status === "COMPLETED") {
        const newEndDate = new Date(renewal.effectiveDate || renewal.agreement.endDate);
        newEndDate.setFullYear(
          newEndDate.getFullYear() + (newTermYears || renewal.agreement.renewalTermYears)
        );

        await prisma.franchiseAgreement.update({
          where: { id: renewal.agreementId },
          data: {
            status: "ACTIVE",
            endDate: newEndDate,
            version: { increment: 1 },
          },
        });

        updateData.signedAt = new Date();
      }

      // If non-renewal or terminated
      if (status === "NON_RENEWAL" || status === "TERMINATED" || status === "DECLINED") {
        await prisma.franchiseAgreement.update({
          where: { id: renewal.agreementId },
          data: {
            status: status === "TERMINATED" ? "TERMINATED" : "EXPIRED",
          },
        });
      }

      // If transferred
      if (status === "TRANSFERRED") {
        await prisma.franchiseAgreement.update({
          where: { id: renewal.agreementId },
          data: { status: "TRANSFERRED" },
        });
      }
    }

    // Franchisee response
    if (franchiseeIntent !== undefined) {
      updateData.franchiseeIntent = franchiseeIntent;
      updateData.franchiseeIntentAt = new Date();
      updateData.status = "INTENT_RECEIVED";
    }
    if (franchiseeNotes !== undefined) {
      updateData.franchiseeNotes = franchiseeNotes;
    }

    // Franchisor decision
    if (franchisorDecision !== undefined) {
      updateData.franchisorDecision = franchisorDecision;
      updateData.franchisorDecisionAt = new Date();
      updateData.decisionBy = session.user.email;

      if (franchisorDecision === "APPROVE_RENEWAL") {
        updateData.status = "APPROVED";
      } else if (franchisorDecision === "APPROVE_WITH_CONDITIONS") {
        updateData.status = "NEGOTIATING";
      } else if (franchisorDecision === "DENY_RENEWAL") {
        updateData.status = "DECLINED";
      } else if (franchisorDecision === "TERMINATE") {
        updateData.status = "TERMINATED";
      } else if (franchisorDecision === "APPROVE_TRANSFER") {
        updateData.status = "TRANSFERRED";
      }
    }
    if (franchisorNotes !== undefined) {
      updateData.franchisorNotes = franchisorNotes;
    }

    // Terms
    if (newTermYears !== undefined) {
      updateData.newTermYears = newTermYears;
      // Calculate new end date
      const effectiveDate = renewal.effectiveDate || renewal.agreement.endDate;
      const newEndDate = new Date(effectiveDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + newTermYears);
      updateData.newEndDate = newEndDate;
    }
    if (renewalFee !== undefined) {
      updateData.renewalFee = renewalFee;
    }
    if (feeWaived !== undefined) {
      updateData.feeWaived = feeWaived;
    }
    if (feeWaivedReason !== undefined) {
      updateData.feeWaivedReason = feeWaivedReason;
    }
    if (newRoyaltyPercent !== undefined) {
      updateData.newRoyaltyPercent = newRoyaltyPercent;
    }

    // Termination
    if (terminationReason !== undefined) {
      updateData.terminationReason = terminationReason;
    }
    if (terminationEffectiveAt !== undefined) {
      updateData.terminationEffectiveAt = terminationEffectiveAt ? new Date(terminationEffectiveAt) : null;
    }

    // Document
    if (renewalAgreementUrl !== undefined) {
      updateData.renewalAgreementUrl = renewalAgreementUrl;
    }

    const updatedRenewal = await prisma.agreementRenewal.update({
      where: { id },
      data: updateData,
      include: {
        agreement: {
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
        },
      },
    });

    return NextResponse.json({ renewal: updatedRenewal });
  } catch (error) {
    console.error("Failed to update renewal:", error);
    return NextResponse.json({ error: "Failed to update renewal" }, { status: 500 });
  }
}
