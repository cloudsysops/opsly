import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POSProvider, IntegrationStatus, SyncFrequency } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET all POS integrations
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const integrations = await prisma.pOSIntegration.findMany({
      include: {
        franchiseeAccount: {
          include: {
            prospect: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = integrations.map((i) => ({
      id: i.id,
      franchiseeAccountId: i.franchiseeAccountId,
      franchiseeName: `${i.franchiseeAccount.prospect.firstName} ${i.franchiseeAccount.prospect.lastName}`,
      provider: i.provider,
      providerName: i.providerName,
      status: i.status,
      connectedAt: i.connectedAt,
      lastSyncAt: i.lastSyncAt,
      lastSyncStatus: i.lastSyncStatus,
      lastError: i.lastError,
      syncFrequency: i.syncFrequency,
      autoSync: i.autoSync,
    }));

    return NextResponse.json({ integrations: formatted });
  } catch (error) {
    console.error("Failed to fetch POS integrations:", error);
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
  }
}

// POST create new POS integration
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      franchiseeAccountId,
      provider,
      providerName,
      merchantId,
      locationId,
      apiKey,
      syncFrequency,
      autoSync,
    } = body;

    // Check if franchisee already has a POS integration
    const existing = await prisma.pOSIntegration.findUnique({
      where: { franchiseeAccountId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Franchisee already has a POS integration configured" },
        { status: 400 }
      );
    }

    const integration = await prisma.pOSIntegration.create({
      data: {
        franchiseeAccountId,
        provider: provider as POSProvider,
        providerName: providerName || null,
        merchantId: merchantId || null,
        locationId: locationId || null,
        apiKey: apiKey || null,
        syncFrequency: (syncFrequency as SyncFrequency) || "DAILY",
        autoSync: autoSync ?? true,
        status: apiKey ? "PENDING" : "CONNECTED", // If no API key, assume manual
      },
      include: {
        franchiseeAccount: {
          include: {
            prospect: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ integration });
  } catch (error) {
    console.error("Failed to create POS integration:", error);
    return NextResponse.json({ error: "Failed to create integration" }, { status: 500 });
  }
}
