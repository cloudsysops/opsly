import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    // Run all searches in parallel
    const [prospects, franchisees, invoices, conversations] = await Promise.all([
      // Search prospects (non-selected)
      db.prospect.findMany({
        where: {
          pipelineStage: { notIn: ["SELECTED", "REJECTED", "WITHDRAWN"] },
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { preferredTerritory: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),

      // Search franchisees (selected prospects)
      db.prospect.findMany({
        where: {
          pipelineStage: "SELECTED",
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { preferredTerritory: { contains: query, mode: "insensitive" } },
          ],
        },
        include: {
          franchiseeAccount: true,
        },
        take: 5,
        orderBy: { selectedAt: "desc" },
      }),

      // Search invoices by number
      db.royaltyInvoice.findMany({
        where: {
          invoiceNumber: { contains: query, mode: "insensitive" },
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
        take: 5,
        orderBy: { invoiceDate: "desc" },
      }),

      // Search conversations (only ones with prospects)
      db.chatConversation.findMany({
        where: {
          prospectId: { not: null },
          prospect: {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          },
        },
        include: {
          prospect: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const results = [
      ...prospects.map((p) => ({
        id: p.id,
        type: "prospect" as const,
        title: `${p.firstName} ${p.lastName}`,
        subtitle: p.email,
        href: `/admin/crm/prospects/${p.id}`,
      })),
      ...franchisees.map((f) => ({
        id: f.franchiseeAccount?.id || f.id,
        type: "franchisee" as const,
        title: `${f.firstName} ${f.lastName}`,
        subtitle: f.preferredTerritory || f.email,
        href: `/admin/franchisees/${f.franchiseeAccount?.id || f.id}`,
      })),
      ...invoices.map((i) => ({
        id: i.id,
        type: "invoice" as const,
        title: i.invoiceNumber,
        subtitle: `${i.franchiseeAccount.prospect.firstName} ${i.franchiseeAccount.prospect.lastName} - $${Number(i.totalAmount).toLocaleString()}`,
        href: `/admin/franchisees/invoices/${i.id}`,
      })),
      ...conversations
        .filter((c) => c.prospect !== null)
        .map((c) => ({
          id: c.id,
          type: "conversation" as const,
          title: `${c.prospect!.firstName} ${c.prospect!.lastName}`,
          subtitle: `Conversation - ${c.prospect!.email}`,
          href: `/admin/crm/conversations/${c.id}`,
        })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [] });
  }
}
