import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET all renewals
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "active";

    let where: any = {};

    if (statusFilter === "active") {
      where.status = {
        notIn: ["COMPLETED", "TERMINATED", "TRANSFERRED", "NON_RENEWAL", "DECLINED"],
      };
    } else if (statusFilter !== "all") {
      where.status = statusFilter;
    }

    const renewals = await prisma.agreementRenewal.findMany({
      where,
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
      orderBy: [
        { responseDeadline: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ renewals });
  } catch (error) {
    console.error("Failed to fetch renewals:", error);
    return NextResponse.json({ error: "Failed to fetch renewals" }, { status: 500 });
  }
}
