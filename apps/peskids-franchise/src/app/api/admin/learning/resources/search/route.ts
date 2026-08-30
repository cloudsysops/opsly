import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface ResourceSearchResult {
  id: string;
  type:
    | "ACADEMY_RESOURCE"
    | "KNOWLEDGE_DOCUMENT"
    | "CREATIVE_ASSET"
    | "MANUAL_PAGE";
  title: string;
  category: string | null;
  description: string | null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") || "";
  const type = req.nextUrl.searchParams.get("type");
  const results: ResourceSearchResult[] = [];

  if (!type || type === "ACADEMY_RESOURCE") {
    const resources = await db.academyResource.findMany({
      where: q ? { title: { contains: q, mode: "insensitive" } } : {},
      take: 10,
      orderBy: { title: "asc" },
    });
    results.push(
      ...resources.map((r) => ({
        id: r.id,
        type: "ACADEMY_RESOURCE" as const,
        title: r.title,
        category: r.category,
        description: r.description?.slice(0, 100) || null,
      }))
    );
  }

  if (!type || type === "KNOWLEDGE_DOCUMENT") {
    const docs = await db.knowledgeDocument.findMany({
      where: q ? { title: { contains: q, mode: "insensitive" } } : {},
      take: 10,
      orderBy: { title: "asc" },
    });
    results.push(
      ...docs.map((d) => ({
        id: d.id,
        type: "KNOWLEDGE_DOCUMENT" as const,
        title: d.title,
        category: d.category,
        description: null,
      }))
    );
  }

  if (!type || type === "CREATIVE_ASSET") {
    const assets = await db.creativeAsset.findMany({
      where: q ? { title: { contains: q, mode: "insensitive" } } : {},
      take: 10,
      orderBy: { title: "asc" },
    });
    results.push(
      ...assets.map((a) => ({
        id: a.id,
        type: "CREATIVE_ASSET" as const,
        title: a.title,
        category: a.category,
        description: a.description?.slice(0, 100) || null,
      }))
    );
  }

  if (!type || type === "MANUAL_PAGE") {
    const pages = await db.manualPage.findMany({
      where: q ? { title: { contains: q, mode: "insensitive" } } : {},
      take: 10,
      orderBy: { title: "asc" },
    });
    results.push(
      ...pages.map((p) => ({
        id: p.id,
        type: "MANUAL_PAGE" as const,
        title: p.title,
        category: null,
        description: p.excerpt?.slice(0, 100) || null,
      }))
    );
  }

  return NextResponse.json({ results });
}
