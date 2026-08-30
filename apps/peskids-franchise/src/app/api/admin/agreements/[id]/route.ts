import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET single agreement
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

    const agreement = await prisma.franchiseAgreement.findUnique({
      where: { id },
      include: {
        franchiseeAccount: {
          include: {
            prospect: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            markets: true,
          },
        },
        renewals: {
          orderBy: { renewalNumber: "asc" },
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

// PATCH update agreement
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
    const { status, documentUrl, territoryDescription, signedAt, signedBy, witnessedBy } = body;

    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = status;
    }
    if (documentUrl !== undefined) {
      updateData.documentUrl = documentUrl;
    }
    if (territoryDescription !== undefined) {
      updateData.territoryDescription = territoryDescription;
    }
    if (signedAt !== undefined) {
      updateData.signedAt = signedAt ? new Date(signedAt) : null;
    }
    if (signedBy !== undefined) {
      updateData.signedBy = signedBy;
    }
    if (witnessedBy !== undefined) {
      updateData.witnessedBy = witnessedBy;
    }

    const agreement = await prisma.franchiseAgreement.update({
      where: { id },
      data: updateData,
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
          orderBy: { renewalNumber: "asc" },
        },
      },
    });

    return NextResponse.json({ agreement });
  } catch (error) {
    console.error("Failed to update agreement:", error);
    return NextResponse.json({ error: "Failed to update agreement" }, { status: 500 });
  }
}

// DELETE agreement (soft delete - just changes status)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Just mark as terminated rather than hard delete
    const agreement = await prisma.franchiseAgreement.update({
      where: { id },
      data: { status: "TERMINATED" },
    });

    return NextResponse.json({ success: true, agreement });
  } catch (error) {
    console.error("Failed to delete agreement:", error);
    return NextResponse.json({ error: "Failed to delete agreement" }, { status: 500 });
  }
}
