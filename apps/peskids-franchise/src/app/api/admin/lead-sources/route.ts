import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET all lead sources with metrics
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leadSources = await db.leadSource.findMany({
      include: {
        spends: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
        },
      },
      orderBy: { name: "asc" },
    });

    // Get session counts by UTM source/medium
    const sessionCounts = await db.visitorSession.groupBy({
      by: ["utmSource", "utmMedium"],
      where: {
        utmSource: { not: null },
      },
      _count: true,
    });

    // Get lead attribution counts by UTM source/medium
    const leadCounts = await db.leadAttribution.groupBy({
      by: ["utmSource", "utmMedium"],
      where: {
        utmSource: { not: null },
      },
      _count: true,
    });

    // Enrich lead sources with computed metrics
    const enriched = leadSources.map((source) => {
      const sessions = sessionCounts
        .filter((s) => {
          if (source.utmSource && source.utmMedium) {
            return s.utmSource === source.utmSource && s.utmMedium === source.utmMedium;
          }
          if (source.utmSource) {
            return s.utmSource === source.utmSource;
          }
          return false;
        })
        .reduce((sum, s) => sum + s._count, 0);

      const leads = leadCounts
        .filter((l) => {
          if (source.utmSource && source.utmMedium) {
            return l.utmSource === source.utmSource && l.utmMedium === source.utmMedium;
          }
          if (source.utmSource) {
            return l.utmSource === source.utmSource;
          }
          return false;
        })
        .reduce((sum, l) => sum + l._count, 0);

      const totalSpend = source.spends.reduce((sum, s) => sum + Number(s.amount), 0);
      const cpl = leads > 0 ? totalSpend / leads : null;

      return {
        ...source,
        sessions,
        leads,
        totalSpend,
        cpl,
      };
    });

    return NextResponse.json({ leadSources: enriched });
  } catch (error) {
    console.error("Failed to fetch lead sources:", error);
    return NextResponse.json({ error: "Failed to fetch lead sources" }, { status: 500 });
  }
}

// POST create new lead source
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, category, utmSource, utmMedium, notes } = body;

    if (!name || !category) {
      return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const existing = await db.leadSource.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "A lead source with this name already exists" }, { status: 400 });
    }

    const leadSource = await db.leadSource.create({
      data: {
        slug,
        name,
        category,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ leadSource });
  } catch (error) {
    console.error("Failed to create lead source:", error);
    return NextResponse.json({ error: "Failed to create lead source" }, { status: 500 });
  }
}
