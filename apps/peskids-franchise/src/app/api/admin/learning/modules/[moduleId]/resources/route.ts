import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resources = await db.moduleResource.findMany({
    where: { moduleId: params.moduleId },
    orderBy: { sortOrder: "asc" },
  });

  // Resolve display info for each linked resource
  const resolved = await Promise.all(
    resources.map(async (r) => {
      let title = r.label || "";
      let url: string | null = null;
      let category: string | null = null;
      let thumbnailUrl: string | null = null;

      switch (r.resourceType) {
        case "ACADEMY_RESOURCE": {
          const res = await db.academyResource.findUnique({
            where: { id: r.resourceId },
          });
          if (res) {
            title = r.label || res.title;
            url = res.fileUrl || res.externalUrl || null;
            category = res.category;
          }
          break;
        }
        case "KNOWLEDGE_DOCUMENT": {
          const doc = await db.knowledgeDocument.findUnique({
            where: { id: r.resourceId },
          });
          if (doc) {
            title = r.label || doc.title;
            category = doc.category;
          }
          break;
        }
        case "CREATIVE_ASSET": {
          const asset = await db.creativeAsset.findUnique({
            where: { id: r.resourceId },
          });
          if (asset) {
            title = r.label || asset.title;
            url =
              asset.fileUrl ||
              asset.externalUrl ||
              asset.canvaEmbedUrl ||
              null;
            category = asset.category;
            thumbnailUrl =
              asset.canvaThumbnailUrl || asset.thumbnailUrl || null;
          }
          break;
        }
        case "MANUAL_PAGE": {
          const page = await db.manualPage.findUnique({
            where: { id: r.resourceId },
          });
          if (page) {
            title = r.label || page.title;
          }
          break;
        }
        case "EXTERNAL_URL": {
          title = r.label || r.resourceId;
          url = r.resourceId;
          break;
        }
      }

      return {
        ...r,
        resolvedTitle: title,
        resolvedUrl: url,
        resolvedCategory: category,
        resolvedThumbnailUrl: thumbnailUrl,
      };
    })
  );

  return NextResponse.json({ resources: resolved });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { resourceType, resourceId, sortOrder = 0, label } = body;

  if (!resourceType || !resourceId) {
    return NextResponse.json(
      { error: "resourceType and resourceId are required" },
      { status: 400 }
    );
  }

  const resource = await db.moduleResource.create({
    data: {
      moduleId: params.moduleId,
      resourceType,
      resourceId,
      sortOrder,
      label: label || null,
    },
  });

  return NextResponse.json({ resource }, { status: 201 });
}
