import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET single POS integration
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

    const integration = await prisma.pOSIntegration.findUnique({
      where: { id },
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

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    return NextResponse.json({ integration });
  } catch (error) {
    console.error("Failed to fetch integration:", error);
    return NextResponse.json({ error: "Failed to fetch integration" }, { status: 500 });
  }
}

// PATCH update POS integration
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

    const integration = await prisma.pOSIntegration.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ integration });
  } catch (error) {
    console.error("Failed to update integration:", error);
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 });
  }
}

// DELETE POS integration
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

    await prisma.pOSIntegration.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete integration:", error);
    return NextResponse.json({ error: "Failed to delete integration" }, { status: 500 });
  }
}
